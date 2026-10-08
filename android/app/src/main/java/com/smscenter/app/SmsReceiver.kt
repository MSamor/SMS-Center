package com.smscenter.app

import android.app.Application
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import android.os.SystemClock

object Background { val executor = Executors.newSingleThreadExecutor() }
class SmsApplication : Application() {
    override fun onCreate() { super.onCreate(); if (AppSettings(this).enabled) UploadWorker.schedule(this) }
}
class SmsReceiver(private val source: String = "系统声明") : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION || !AppSettings(context).enabled) return
        val parts = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (parts.isEmpty()) return
        val pending = goAsync()
        val finished = AtomicBoolean(false)
        val deadline = SystemClock.elapsedRealtime() + 8000
        fun finish() { if (finished.compareAndSet(false, true)) pending.finish() }
        // Includes executor wait time. Do not hold the broadcast while network/DNS is stalled.
        val watchdog = BroadcastUpload.timer.schedule({ finish() }, 8, TimeUnit.SECONDS)
        BroadcastUpload.executor.execute {
            try {
                val settings = AppSettings(context)
                if (!settings.enabled) return@execute
                val sender = parts.first().originatingAddress ?: "unknown"
                val body = parts.joinToString("") { it.messageBody ?: "" }
                val timestamp = parts.first().timestampMillis
                QueueDb(context).use { db ->
                    val added = db.enqueue(sender, body, timestamp, settings.extraKeywords)
                    // Both registered and manifest receivers may receive the same message.
                    // Do not replace a completed upload result with a duplicate-delivery status.
                    if (!added) {
                        if (!QueueDb.isCandidate(body, settings.extraKeywords)) settings.lastReceiveResult = "收到短信，未命中验证码规则"
                        return@use
                    }
                    settings.lastReceiveResult = "收到验证码候选，已加密入队"
                    settings.lastBroadcastSource = source
                    // Persist a fallback before networking, so process death does not lose the upload.
                    UploadWorker.enqueue(context, delaySeconds = 10)
                    val item = db.pendingItem(QueueDb.messageId(sender, body, timestamp))
                    if (item != null && SystemClock.elapsedRealtime() < deadline - 6500 && settings.enabled) {
                        val token = settings.token
                        if (token.isNotBlank() && settings.server.isNotBlank()) {
                            val complete = QueueUploader.upload(db, settings, token, item, immediate = true)
                            if (!complete) UploadWorker.enqueue(context, urgent = true)
                            settings.lastReceiveResult = if (complete) "收到验证码候选，立即上传处理完成" else "收到验证码候选，立即上传未成功，已安排重试"
                        }
                    } else UploadWorker.enqueue(context, urgent = true)
                }
            } catch (_: Exception) {
                AppSettings(context).lastError = "短信入队或立即上传失败，请检查权限、网络与存储状态"
                runCatching { UploadWorker.enqueue(context, urgent = true) }
            } finally { watchdog.cancel(false); finish() }
        }
    }
}

// Do not queue SMS delivery behind manual history import or a slow connection check.
object BroadcastUpload {
    val executor = Executors.newFixedThreadPool(2)
    val timer = Executors.newSingleThreadScheduledExecutor()
}
