package com.smscenter.app

import android.content.Context
import androidx.work.*
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.TimeUnit

object CenterApi {
    data class Response(val status: Int, val json: JSONObject)
    fun call(server: String, token: String, path: String, payload: String? = null): Response {
        val url = URL(server.trimEnd('/') + path)
        require(url.protocol == "https" || url.protocol == "http") { "只支持 HTTP 或 HTTPS 地址" }
        val connection = (url.openConnection() as HttpURLConnection).apply {
            connectTimeout = 15000; readTimeout = 20000; instanceFollowRedirects = false
            requestMethod = if (payload == null) "GET" else "POST"
            setRequestProperty("Authorization", "Bearer $token")
            setRequestProperty("Accept", "application/json")
            if (payload != null) { doOutput = true; setRequestProperty("Content-Type", "application/json; charset=utf-8") }
        }
        try {
            if (payload != null) connection.outputStream.use { it.write(payload.toByteArray(Charsets.UTF_8)) }
            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val text = stream?.bufferedReader()?.use { it.readText().take(32000) } ?: "{}"
            return Response(status, runCatching { JSONObject(text) }.getOrElse { JSONObject() })
        } finally { connection.disconnect() }
    }
}

class UploadWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
    override fun doWork(): Result {
        val settings = AppSettings(applicationContext)
        if (!settings.enabled || settings.server.isBlank()) return Result.success()
        val token = try { settings.token } catch (_: Exception) { settings.lastError = "无法读取加密凭证，请重新保存上传 Token"; return Result.failure() }
        if (token.isBlank()) return Result.success()
        QueueDb(applicationContext).use { db ->
            db.cleanup()
            while (!isStopped && settings.enabled) {
                val items = db.pending()
                if (items.isEmpty()) return Result.success()
                for (item in items) {
                    if (isStopped || !settings.enabled) return Result.success()
                    db.attempted(item.id)
                    try {
                        val payload = SecureStore.decrypt(item.payload, item.id)
                        val result = CenterApi.call(settings.server, token, "/api/v1/sms", payload)
                        when {
                            result.status in 200..299 -> { db.complete(item.id, "uploaded"); settings.lastError = "" }
                            result.status == 401 || result.status == 403 -> { settings.lastError = "上传凭证无效或设备被停用（${result.status}），请检查设置"; return Result.retry() }
                            result.status == 429 || result.status >= 500 -> { settings.lastError = "服务暂时不可用（${result.status}），将自动重试"; return Result.retry() }
                            result.status in listOf(400, 413, 422) -> {
                                val error = result.json.optJSONObject("error")?.optString("message") ?: "短信不符合服务规则"
                                db.complete(item.id, "rejected", error); settings.lastError = error
                            }
                            else -> { settings.lastError = "服务地址或协议有误（${result.status}），请验证连接"; return Result.retry() }
                        }
                    } catch (_: Exception) { settings.lastError = "网络连接或本地解密失败，任务将自动重试"; return Result.retry() }
                }
            }
        }
        return Result.success()
    }
    companion object {
        // A private LAN server may be reachable without public Internet validation.
        // Attempt the configured endpoint directly; failures use exponential backoff.
        fun enqueue(context: Context, force: Boolean = false) {
            val request = OneTimeWorkRequestBuilder<UploadWorker>()
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS).build()
            WorkManager.getInstance(context).enqueueUniqueWork("sms-upload", if (force) ExistingWorkPolicy.REPLACE else ExistingWorkPolicy.APPEND_OR_REPLACE, request)
        }
        fun schedule(context: Context) {
            WorkManager.getInstance(context).enqueueUniquePeriodicWork("sms-upload-periodic", ExistingPeriodicWorkPolicy.UPDATE,
                PeriodicWorkRequestBuilder<UploadWorker>(15, TimeUnit.MINUTES).build())
        }
        fun stop(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork("sms-upload")
            WorkManager.getInstance(context).cancelUniqueWork("sms-upload-periodic")
        }
    }
}
