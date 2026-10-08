package com.smscenter.app

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.database.ContentObserver
import android.os.Handler
import android.os.Looper
import android.provider.Telephony
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

/** Collect newly stored inbox rows even if the OEM refuses SMS_RECEIVED delivery. */
class SmsInboxMonitor(context: Context) {
    private val context = context.applicationContext
    private val settings = AppSettings(this.context)
    private val executor = Executors.newSingleThreadScheduledExecutor()
    private val queued = AtomicBoolean(false)
    @Volatile private var stopped = false
    private var registered = false
    private var started = false
    private var lastScanElapsed = 0L
    private val observer = object : ContentObserver(Handler(Looper.getMainLooper())) {
        override fun onChange(selfChange: Boolean) { requestScan() }
    }
    fun start() {
        if (stopped || started) return
        if (context.checkSelfPermission(Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) {
            settings.lastInboxResult = "未授权短信读取，短信库备用采集不可用"
            return
        }
        try {
            context.contentResolver.registerContentObserver(Telephony.Sms.CONTENT_URI, true, observer)
            registered = true
        } catch (_: Exception) {
            settings.lastInboxResult = "短信库监听注册受限，将尝试定时检查"
        }
        started = true
        executor.scheduleWithFixedDelay({ requestScan() }, 0, 5, TimeUnit.SECONDS)
    }
    private fun requestScan() {
        if (stopped || !queued.compareAndSet(false, true)) return
        try { executor.execute { try { scan() } finally { queued.set(false) } } }
        catch (_: java.util.concurrent.RejectedExecutionException) { queued.set(false) }
    }
    private fun scan() {
        if (stopped || !settings.enabled) return
        val now = android.os.SystemClock.elapsedRealtime()
        if (lastScanElapsed > 0) {
            val gap = now - lastScanElapsed
            settings.scanGapMillis = gap
            settings.maxScanGapMillis = maxOf(gap, settings.maxScanGapMillis)
        }
        lastScanElapsed = now
        settings.lastInboxResult = "开始读取检查"
        try {
            QueueDb(context).use { db ->
                if (settings.inboxSince == 0L) {
                    // Upgrade of an already enabled installation: recover missed recent messages.
                    // Avoid reimporting the last legacy broadcast row (provider timestamp differs).
                    val last = db.lastReceivedAt()
                    settings.inboxSince = if (last > 0) maxOf(last + 5000, System.currentTimeMillis() - 86400000) else System.currentTimeMillis()
                }
                val cursor = context.contentResolver.query(
                    Telephony.Sms.Inbox.CONTENT_URI, arrayOf("_id", "address", "body", "date"),
                    "_id > ? AND date >= ?", arrayOf(settings.inboxLastId.toString(), settings.inboxSince.toString()), "_id ASC"
                ) ?: throw IllegalStateException("SMS provider returned null")
                var scanned = 0
                var added = 0
                cursor.use { c ->
                    while (!stopped && settings.enabled && scanned < 500 && c.moveToNext()) {
                        scanned++
                        val rowId = c.getLong(0)
                        val sender = c.getString(1) ?: "unknown"
                        val body = c.getString(2) ?: ""
                        val time = c.getLong(3)
                        if (body.isBlank()) {
                            settings.lastInboxResult = "短信库正文为空，请检查厂商短信隐私权限"
                            return
                        }
                        if (db.enqueue(sender, body, time, settings.extraKeywords)) {
                            added++
                            settings.lastBroadcastSource = "短信库备用采集"
                            settings.lastReceiveResult = "短信库发现验证码候选，已加密入队"
                            // Persist retry before the HTTP request, just as in the broadcast path.
                            UploadWorker.enqueue(context, delaySeconds = 10)
                            val item = db.pendingItem(QueueDb.messageId(sender, body, time))
                            val token = settings.token
                            if (item != null && token.isNotBlank() && settings.server.isNotBlank()) {
                                val complete = QueueUploader.upload(db, settings, token, item, immediate = true)
                                if (!complete) UploadWorker.enqueue(context, urgent = true)
                                settings.lastReceiveResult = if (complete) "短信库验证码上传处理完成" else "短信库验证码上传未成功，已安排重试"
                            }
                        }
                        // Checkpoint only after enqueue and retry scheduling; retries remain durable.
                        settings.inboxLastId = rowId
                    }
                }
                settings.lastInboxResult = "读取检查正常，本次新增 $added 条候选（扫描 $scanned 条）"
            }
        } catch (_: SecurityException) {
            settings.lastInboxResult = "短信库读取被系统拒绝，请检查短信读取及厂商额外权限"
        } catch (_: Exception) {
            settings.lastInboxResult = "短信库检查失败，将在 5 秒后重试"
        }
    }
    fun stop() {
        stopped = true
        if (registered) { context.contentResolver.unregisterContentObserver(observer); registered = false }
        executor.shutdownNow()
    }
}
