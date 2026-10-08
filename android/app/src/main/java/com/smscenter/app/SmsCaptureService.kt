package com.smscenter.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.provider.Telephony
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder

/** User-visible, continuous SMS reception; no polling, SMS-body notification or permanent wake lock. */
class SmsCaptureService : Service() {
    private val smsReceiver = SmsReceiver("常驻服务")
    private var registered = false
    private val inboxMonitor by lazy { SmsInboxMonitor(this) }
    override fun onBind(intent: Intent?): IBinder? = null
    override fun onCreate() {
        super.onCreate()
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(NotificationChannel(CHANNEL, "后台短信采集", NotificationManager.IMPORTANCE_LOW))
        showForegroundNotification()
        try {
            val filter = IntentFilter(Telephony.Sms.Intents.SMS_RECEIVED_ACTION).apply { priority = 500 }
            // Telephony uses a privileged non-system UID. Require BROADCAST_SMS from the sender.
            registerReceiver(smsReceiver, filter, android.Manifest.permission.BROADCAST_SMS, null,
                if (Build.VERSION.SDK_INT >= 33) Context.RECEIVER_EXPORTED else 0)
            registered = true
            receiverRegistered = true
        } catch (_: Exception) {
            AppSettings(this).lastError = "常驻短信接收器注册失败，请检查短信权限并重新开启采集"
        }
        inboxMonitor.start()
        running = true
    }
    private fun showForegroundNotification() {
        val open = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val stop = PendingIntent.getService(this, 1, Intent(this, SmsCaptureService::class.java).setAction(STOP), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val builder = Notification.Builder(this, CHANNEL)
            .setSmallIcon(com.smscenter.app.R.drawable.ic_notification)
            .setContentTitle("短信中枢：后台采集中")
            .setContentText("验证码短信收到后立即尝试上传；点击打开设置")
            .setContentIntent(open).setOngoing(true).setShowWhen(false)
            .setCategory(Notification.CATEGORY_SERVICE).setVisibility(Notification.VISIBILITY_PRIVATE)
            .addAction(Notification.Action.Builder(null, "停止采集", stop).build())
        if (Build.VERSION.SDK_INT >= 31) builder.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE)
        val notification = builder.build()
        if (Build.VERSION.SDK_INT >= 34) startForeground(NOTIFICATION, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        else startForeground(NOTIFICATION, notification)
    }
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val settings = AppSettings(this)
        if (intent?.action == STOP) { settings.enabled = false; UploadWorker.stop(this) }
        if (!settings.enabled) { stopForeground(STOP_FOREGROUND_REMOVE); stopSelf(); return START_NOT_STICKY }
        inboxMonitor.start()
        // Repost after permission changes or dismissal when the user reopens the App.
        showForegroundNotification()
        UploadWorker.schedule(this)
        return START_STICKY
    }
    override fun onDestroy() {
        inboxMonitor.stop()
        if (registered) { unregisterReceiver(smsReceiver); registered = false }
        receiverRegistered = false; running = false
        super.onDestroy()
    }
    companion object {
        private const val CHANNEL = "sms-capture"
        private const val NOTIFICATION = 1001
        private const val STOP = "com.smscenter.app.STOP_CAPTURE"
        @Volatile var running = false
            private set
        @Volatile var receiverRegistered = false
            private set
        fun start(context: Context) {
            if (!AppSettings(context).enabled) return
            try { context.startForegroundService(Intent(context, SmsCaptureService::class.java)) }
            catch (_: Exception) { AppSettings(context).lastError = "后台采集服务启动受限，请打开 App 并允许后台运行、自启动" }
        }
        fun stop(context: Context) { context.stopService(Intent(context, SmsCaptureService::class.java)) }
    }
}

class CaptureBootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action in listOf(Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED) && AppSettings(context).enabled) {
            SmsCaptureService.start(context)
        }
    }
}
