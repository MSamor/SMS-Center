package com.smscenter.app

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.os.PowerManager

/** Explicit realtime mode only: keep CPU awake, never light the display. */
class CaptureWakeController(context: Context) {
    private val settings = AppSettings(context)
    private val handler = Handler(Looper.getMainLooper())
    private val lock = (context.getSystemService(Context.POWER_SERVICE) as PowerManager)
        .newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "smscenter:realtime-capture")
        .apply { setReferenceCounted(false) }
    private var active = false
    private val renewal = object : Runnable {
        override fun run() {
            if (!active) return
            refresh()
        }
    }
    val held: Boolean get() = lock.isHeld
    fun start() { active = true; refresh() }
    fun refresh() {
        handler.removeCallbacks(renewal)
        if (!active) return
        if (settings.enabled && settings.realtimeMode) {
            // Bound each lease so a failed service/lifecycle does not leave an unbounded lock.
            lock.acquire(LEASE_MS)
        } else if (lock.isHeld) lock.release()
        handler.postDelayed(renewal, RENEW_MS)
    }
    fun stop() {
        active = false
        handler.removeCallbacks(renewal)
        if (lock.isHeld) lock.release()
    }
    companion object {
        private const val LEASE_MS = 10 * 60 * 1000L
        private const val RENEW_MS = 5 * 60 * 1000L
    }
}
