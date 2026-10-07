package com.smscenter.app

import android.app.Application
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import java.util.concurrent.Executors

object Background { val executor = Executors.newSingleThreadExecutor() }
class SmsApplication : Application() {
    override fun onCreate() { super.onCreate(); if (AppSettings(this).enabled) UploadWorker.schedule(this) }
}
class SmsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION || !AppSettings(context).enabled) return
        val parts = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (parts.isEmpty()) return
        val pending = goAsync()
        Background.executor.execute {
            try {
                val settings = AppSettings(context)
                val body = parts.joinToString("") { it.messageBody ?: "" }
                QueueDb(context).use { db -> db.enqueue(parts.first().originatingAddress ?: "unknown", body, parts.first().timestampMillis, settings.extraKeywords) }
                UploadWorker.enqueue(context)
            } catch (_: Exception) { AppSettings(context).lastError = "短信入队失败，请打开 App 检查权限与存储状态" }
            finally { pending.finish() }
        }
    }
}
