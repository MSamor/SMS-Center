package com.smscenter.app

import android.content.Context
import androidx.work.*
import org.json.JSONObject
import android.os.Build
import java.util.concurrent.TimeUnit

object CenterApi {
    data class Response(val status: Int, val json: JSONObject)
    private val normal = CenterTransport(35000)
    private val immediateTransport = CenterTransport(6000)
    fun call(server: String, token: String, path: String, payload: String? = null, immediate: Boolean = false): Response {
        val result = (if (immediate) immediateTransport else normal).call(server, token, path, payload)
        return Response(result.status, runCatching { JSONObject(result.text) }.getOrElse { JSONObject() })
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
                    if (!QueueUploader.upload(db, settings, token, item)) return Result.retry()
                }
            }
        }
        return Result.success()
    }
    companion object {
        // A private LAN server may be reachable without public Internet validation.
        // Attempt the configured endpoint directly; failures use exponential backoff.
        fun enqueue(context: Context, force: Boolean = false, urgent: Boolean = false, delaySeconds: Long = 0) {
            val builder = OneTimeWorkRequestBuilder<UploadWorker>()
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
            if (delaySeconds > 0) builder.setInitialDelay(delaySeconds, TimeUnit.SECONDS)
            // Before Android 12 use normal work; expedited work there requires a foreground service.
            if (urgent && Build.VERSION.SDK_INT >= 31) builder.setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
            WorkManager.getInstance(context).enqueueUniqueWork(
                if (urgent) "sms-upload-urgent" else "sms-upload",
                if (force) ExistingWorkPolicy.REPLACE else if (urgent) ExistingWorkPolicy.KEEP else ExistingWorkPolicy.APPEND_OR_REPLACE,
                builder.build()
            )
        }
        fun schedule(context: Context) {
            WorkManager.getInstance(context).enqueueUniquePeriodicWork("sms-upload-periodic", ExistingPeriodicWorkPolicy.UPDATE,
                PeriodicWorkRequestBuilder<UploadWorker>(15, TimeUnit.MINUTES).build())
        }
        fun stop(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork("sms-upload")
            WorkManager.getInstance(context).cancelUniqueWork("sms-upload-urgent")
            WorkManager.getInstance(context).cancelUniqueWork("sms-upload-periodic")
        }
    }
}

// The immediate broadcast path and durable worker share status/retry handling.
object QueueUploader {
    fun upload(db: QueueDb, settings: AppSettings, token: String, item: QueueDb.Item, immediate: Boolean = false): Boolean {
        if (!settings.enabled) return true
        db.attempted(item.id)
        try {
            val payload = SecureStore.decrypt(item.payload, item.id)
            val result = CenterApi.call(settings.server, token, "/api/v1/sms", payload, immediate)
            when {
                result.status in 200..299 -> { db.complete(item.id, "uploaded"); settings.lastError = "" }
                result.status == 401 || result.status == 403 -> {
                    settings.lastError = "上传凭证无效或设备被停用（${result.status}），请检查设置"; return false
                }
                result.status == 429 || result.status >= 500 -> {
                    settings.lastError = "服务暂时不可用（${result.status}），将自动重试"; return false
                }
                result.status in listOf(400, 413, 422) -> {
                    val error = result.json.optJSONObject("error")?.optString("message") ?: "短信不符合服务规则"
                    db.complete(item.id, "rejected", error); settings.lastError = error
                }
                else -> { settings.lastError = "服务地址或协议有误（${result.status}），请验证连接"; return false }
            }
        } catch (_: Exception) {
            settings.lastError = "网络连接或本地解密失败，任务将自动重试"; return false
        }
        return true
    }
}
