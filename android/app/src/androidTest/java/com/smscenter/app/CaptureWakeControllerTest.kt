package com.smscenter.app

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith

/** Disposable emulator only. Verify explicit mode and all release paths. */
@RunWith(AndroidJUnit4::class)
class CaptureWakeControllerTest {
    @Test fun modeAndCollectionLifecycleControlWakeLock() {
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val settings = AppSettings(instrumentation.targetContext)
        instrumentation.runOnMainSync {
            val controller = CaptureWakeController(instrumentation.targetContext)
            try {
                settings.enabled = true
                settings.realtimeMode = false
                controller.start()
                assertFalse(controller.held)
                settings.realtimeMode = true
                controller.refresh()
                assertTrue(controller.held)
                settings.realtimeMode = false
                controller.refresh()
                assertFalse(controller.held)
                settings.realtimeMode = true
                controller.refresh()
                assertTrue(controller.held)
                settings.enabled = false
                controller.refresh()
                assertFalse(controller.held)
                settings.enabled = true
                controller.refresh()
                assertTrue(controller.held)
                controller.stop()
                assertFalse(controller.held)
            } finally {
                controller.stop()
                settings.enabled = false
                settings.realtimeMode = false
            }
        }
    }
}
