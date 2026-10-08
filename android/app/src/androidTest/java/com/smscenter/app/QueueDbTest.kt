package com.smscenter.app

import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import android.database.sqlite.SQLiteDatabase
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*
import org.junit.runner.RunWith

/** Run only on a disposable emulator; these tests reset the target's local queue. */
@RunWith(AndroidJUnit4::class)
class QueueDbTest {
    private val context get() = InstrumentationRegistry.getInstrumentation().targetContext
    @Before fun reset() {
        AppSettings(context).enabled = false
        context.deleteDatabase("encrypted_queue.db")
    }
    @After fun cleanup() { context.deleteDatabase("encrypted_queue.db") }
    @Test fun broadcastAndProviderTimestampDifferenceDoesNotDuplicate() {
        QueueDb(context).use { db ->
            assertTrue(db.enqueue("10690000", "[Test] verification code 123456", 100000, ""))
            assertFalse(db.enqueue("10690000", "[Test] verification code 123456", 102000, ""))
            assertEquals(1, db.stats().total)
            assertTrue(db.enqueue("10690000", "[Test] verification code 654321", 102000, ""))
            assertTrue(db.enqueue("10690001", "[Test] verification code 123456", 102000, ""))
            assertEquals(3, db.stats().total)
        }
    }
    @Test fun completedPayloadIsRemovedButFingerprintStillDeduplicates() {
        QueueDb(context).use { db ->
            val body = "[Test] verification code 123456"
            assertTrue(db.enqueue("10690000", body, 100000, ""))
            db.complete(QueueDb.messageId("10690000", body, 100000), "uploaded")
            assertTrue(db.pending().isEmpty())
            assertFalse(db.enqueue("10690000", body, 103000, ""))
            assertEquals(1, db.stats().uploaded)
            assertTrue(db.enqueue("10690000", body, 110000, ""))
        }
    }
    @Test fun migrationPreservesLegacyQueueAndPayload() {
        val file = context.getDatabasePath("encrypted_queue.db")
        file.parentFile!!.mkdirs()
        SQLiteDatabase.openOrCreateDatabase(file, null).use { db ->
            db.execSQL("CREATE TABLE queue (id TEXT PRIMARY KEY, signature TEXT NOT NULL, payload TEXT, received_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, error TEXT NOT NULL DEFAULT '')")
            db.execSQL("CREATE INDEX queue_status ON queue(status,received_at)")
            db.execSQL("INSERT INTO queue (id,signature,payload,received_at) VALUES ('legacy','Test','encrypted-fixture',1000)")
            db.version = 1
        }
        QueueDb(context).use { db ->
            assertEquals(2, db.readableDatabase.version)
            assertEquals("encrypted-fixture", db.pending().single().payload)
            assertEquals(1, db.stats().total)
            assertTrue(db.enqueue("10690000", "[Test] verification code 123456", 100000, ""))
            assertEquals(2, db.stats().total)
        }
    }
}
