package com.smscenter.app

import android.Manifest
import android.app.Activity
import android.app.AlertDialog
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.view.WindowInsets
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.provider.Settings
import android.provider.Telephony
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.widget.*
import java.net.URI
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : Activity() {
    private lateinit var settings: AppSettings
    private lateinit var content: LinearLayout
    private var tab = 0
    private val mainHandler = Handler(Looper.getMainLooper())
    private val refresh = object : Runnable { override fun run() { if (tab == 0) render(); mainHandler.postDelayed(this, 5000) } }
    private val blue = Color.rgb(37, 99, 235)
    private val muted = Color.rgb(130, 146, 169)
    private val ink = Color.rgb(43, 62, 91)
    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
    override fun onCreate(savedInstanceState: Bundle?) { super.onCreate(savedInstanceState); settings = AppSettings(this); render() }
    override fun onResume() { super.onResume(); if (::settings.isInitialized) { SmsCaptureService.start(this); render() }; mainHandler.postDelayed(refresh, 5000) }
    override fun onPause() { mainHandler.removeCallbacks(refresh); super.onPause() }
    private fun background(color: Int, radius: Int = 14): GradientDrawable = GradientDrawable().apply { setColor(color); cornerRadius = dp(radius).toFloat() }
    private fun text(value: String, size: Float = 14f, color: Int = ink, bold: Boolean = false) = TextView(this).apply {
        text = value; textSize = size; setTextColor(color); if (bold) setTypeface(null, Typeface.BOLD); setLineSpacing(dp(4).toFloat(), 1f)
    }
    private fun LinearLayout.addSpaced(view: View, top: Int = 12) { addView(view, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(top) }) }
    private fun button(label: String, primary: Boolean = false, action: () -> Unit) = Button(this).apply {
        text = label; textSize = 13f; isAllCaps = false; setTextColor(if (primary) Color.WHITE else blue)
        background = background(if (primary) blue else Color.rgb(235, 242, 255), 10); minHeight = dp(46); setPadding(dp(10), dp(8), dp(10), dp(8)); setOnClickListener { action() }
    }
    private fun card(): LinearLayout = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(20), dp(19), dp(20), dp(19)); background = background(Color.WHITE) }
    @Suppress("DEPRECATION") // Android 8–10 use the legacy inset accessors.
    private fun render() {
        val root = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(22), dp(22), dp(22), dp(12)); setBackgroundColor(Color.rgb(245, 248, 255)) }
        root.setOnApplyWindowInsetsListener { view, insets ->
            val top: Int
            val bottom: Int
            if (Build.VERSION.SDK_INT >= 30) {
                val bars = insets.getInsets(WindowInsets.Type.systemBars())
                top = bars.top; bottom = bars.bottom
            } else {
                top = insets.systemWindowInsetTop; bottom = insets.systemWindowInsetBottom
            }
            view.setPadding(dp(22), dp(22) + top, dp(22), dp(12) + bottom)
            insets
        }
        val title = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        title.addView(text("▣", 29f, blue, true)); title.addView(text("  短信中枢", 23f, ink, true)); root.addView(title)
        root.addSpaced(text("SMS CENTER  /  ANDROID", 10f, muted), 4)
        val tabs = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
        listOf("接收统计", "连接与设置").forEachIndexed { i, label ->
            tabs.addView(button(label, tab == i) { tab = i; render() }, LinearLayout.LayoutParams(0, dp(44), 1f).apply { if (i > 0) leftMargin = dp(10) })
        }
        root.addSpaced(tabs, 23)
        val scroll = ScrollView(this).apply { isFillViewport = false; clipToPadding = false }
        content = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(0, dp(18), 0, dp(24)) }
        scroll.addView(content); root.addView(scroll, LinearLayout.LayoutParams(-1, 0, 1f)); setContentView(root)
        if (tab == 0) statistics() else setup()
    }
    private fun statistics() {
        val state = card(); state.background = background(Color.rgb(231, 240, 255))
        state.addView(text(if (settings.enabled) "采集已开启" else "等待接入设备", 20f, blue, true))
        state.addSpaced(text(if (settings.enabled) "验证码短信会加密入队并立即尝试上传，失败后自动重试。" else "先配置服务地址和上传 Token，再授权短信接收。", 12f, muted), 8)
        state.addSpaced(text("后台服务：${if (SmsCaptureService.running) "运行中" else "未运行"} · 常驻短信接收：${if (SmsCaptureService.receiverRegistered) "已注册" else "未注册"}", 11f, muted), 10)
        state.addSpaced(text("实时模式：${if (settings.realtimeMode) "开启" else "关闭"} · CPU 唤醒锁：${if (SmsCaptureService.cpuAwake) "已申请（系统仍可能禁用）" else "未申请"}", 11f, muted), 6)
        state.addSpaced(text("检查间隔：${settings.scanGapMillis / 1000} 秒 · 最长间隔：${settings.maxScanGapMillis / 1000} 秒", 11f, muted), 6)
        state.addSpaced(text("最近上传请求：${settings.lastUploadAttempt}", 11f, muted), 6)
        state.addSpaced(text("短信库检查：${settings.lastInboxResult}", 11f, muted), 6)
        state.addSpaced(text("最近接收入口：${settings.lastBroadcastSource}", 11f, muted), 6)
        state.addSpaced(text("最近广播：${settings.lastReceiveResult}", 11f, muted), 10)
        if (!settings.enabled) state.addSpaced(button("前往设置") { tab = 1; render() }, 15)
        content.addView(state)
        val db = QueueDb(this)
        try {
            val stats = db.stats()
            val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
            listOf("已上传" to stats.uploaded, "待上传" to stats.pending, "已拒绝" to stats.rejected).forEachIndexed { i, entry ->
                val tile = card(); tile.setPadding(dp(13), dp(17), dp(13), dp(17)); tile.addView(text(entry.second.toString(), 28f, if (i == 1) blue else ink, true)); tile.addSpaced(text(entry.first, 11f, muted), 5)
                row.addView(tile, LinearLayout.LayoutParams(0, -2, 1f).apply { if (i > 0) leftMargin = dp(9) })
            }
            content.addSpaced(row, 16)
            if (settings.lastError.isNotBlank()) { val warning = card(); warning.addView(text("需要留意", 14f, Color.rgb(190, 127, 63), true)); warning.addSpaced(text(settings.lastError, 12f, muted), 8); content.addSpaced(warning, 16) }
            content.addSpaced(button("立即尝试上传", true) { if (!settings.enabled) toast("请先在设置中开启采集") else { UploadWorker.enqueue(this, force = true); toast("已加入后台上传任务") } }, 16)
            val list = card(); list.addView(text("最近接收", 16f, ink, true)); list.addSpaced(text("仅展示签名与状态，不展示验证码原文", 10f, muted), 5)
            val recent = db.recent()
            if (recent.isEmpty()) list.addSpaced(text("暂无记录。收到新的验证码短信后会出现在这里。", 12f, muted), 22)
            recent.forEach { item ->
                val label = when (item.status) { "uploaded" -> "已上传"; "rejected" -> "已拒绝"; else -> "待上传" }
                list.addSpaced(text("${item.signature}  ·  $label", 13f, ink, true), 20)
                list.addSpaced(text(SimpleDateFormat("MM-dd HH:mm:ss", Locale.CHINA).format(Date(item.time)), 10f, muted), 3)
                if (item.error.isNotBlank()) list.addSpaced(text(item.error, 10f, muted), 3)
            }
            content.addSpaced(list, 18)
        } catch (_: Exception) { content.addSpaced(text("读取本地队列失败，请检查可用存储空间", 12f, muted)) } finally { db.close() }
        content.addSpaced(text("本地记录保留 30 天 · 上传成功后立即移除本地短信原文", 10f, muted), 18)
    }
    private fun input(value: String, hint: String, type: Int = InputType.TYPE_CLASS_TEXT): EditText = EditText(this).apply {
        setText(value); this.hint = hint; textSize = 13f; inputType = type; setTextColor(ink); setHintTextColor(muted)
        background = background(Color.rgb(248, 250, 254), 8); setPadding(dp(12), dp(12), dp(12), dp(12))
    }
    private fun setup() {
        val config = card(); config.addView(text("服务中心连接", 16f, ink, true))
        config.addSpaced(text("服务地址", 12f, muted), 18)
        val address = input(settings.server, "https://sms.example.com", InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI)
        config.addSpaced(address, 7); config.addSpaced(text("填写服务根地址，局域网调试支持 HTTP；公网请使用 HTTPS。", 10f, muted), 7)
        config.addSpaced(text("设备上传 Token", 12f, muted), 16)
        val savedToken = runCatching { settings.token }.getOrDefault("")
        val token = input(savedToken, "upl_…", InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD)
        config.addSpaced(token, 7); config.addSpaced(text("在管理中心的「设备管理」中生成，不使用查询 Token。", 10f, muted), 7)
        config.addSpaced(text("额外采集关键词（可选）", 12f, muted), 16)
        val keywords = input(settings.extraKeywords, "用逗号分隔，如：登录口令")
        config.addSpaced(keywords, 7); config.addSpaced(text("特殊关键词需在管理中心同时配置对应签名识别规则。", 10f, muted), 7)
        config.addSpaced(button("保存连接设置", true) {
            val server = address.text.toString().trim().trimEnd('/')
            val rawToken = token.text.toString().trim()
            try {
                val uri = URI(server)
                require(uri.scheme in listOf("http", "https") && !uri.host.isNullOrBlank() && uri.userInfo == null && uri.query == null && uri.fragment == null && (uri.path.isNullOrEmpty() || uri.path == "/")) { "请输入合法的服务根地址，不带路径、查询参数或账号" }
                require(Regex("upl_[A-Za-z0-9_-]{43}").matches(rawToken)) { "请填写有效的设备上传 Token（upl_ 开头）" }
                settings.server = server; settings.token = rawToken; settings.extraKeywords = keywords.text.toString().trim().take(500); settings.lastError = ""; settings.deviceName = "尚未验证连接"
                if (settings.enabled) { UploadWorker.schedule(this); UploadWorker.enqueue(this, force = true) }
                toast("设置已保存"); render()
            } catch (e: Exception) { toast(e.message ?: "设置保存失败") }
        }, 17)
        config.addSpaced(button("验证服务与设备") {
            if (settings.server.isBlank()) { toast("请先保存连接设置"); return@button }
            toast("正在验证连接…")
            Background.executor.execute {
                try {
                    val result = CenterApi.call(settings.server, settings.token, "/api/v1/device")
                    if (result.status == 200) { settings.deviceName = result.json.getJSONObject("data").getString("name"); settings.lastError = ""; runOnUiThread { toast("已连接：${settings.deviceName}"); if (tab == 1) render() } }
                    else runOnUiThread { toast(result.json.optJSONObject("error")?.optString("message") ?: "连接失败（${result.status}）") }
                } catch (_: Exception) { runOnUiThread { toast("无法访问服务，请检查地址、网络或证书") } }
            }
        }, 11)
        config.addSpaced(text("连接设备：${settings.deviceName}", 11f, muted), 10)
        content.addView(config)
        val permission = card(); permission.addView(text("采集与权限", 16f, ink, true))
        val toggle = Switch(this).apply { text = "开启验证码短信采集"; textSize = 13f; isChecked = settings.enabled; setTextColor(ink) }
        permission.addSpaced(toggle, 16)
        toggle.setOnCheckedChangeListener { _, enabled ->
            if (!enabled) { settings.enabled = false; SmsCaptureService.stop(this); UploadWorker.stop(this); toast("采集已关闭"); return@setOnCheckedChangeListener }
            toggle.isChecked = false
            if (settings.server.isBlank() || runCatching { settings.token }.getOrDefault("").isBlank()) { toast("请先保存服务地址和 Token"); return@setOnCheckedChangeListener }
            AlertDialog.Builder(this).setTitle("授权验证码采集").setMessage("开启后，App 会接收此手机的新短信，筛选包含验证码关键词的短信，加密保存待上传内容并发送到你配置的服务中心。仅对你本人拥有或已获得授权的手机启用。\n\n开启后会显示后台采集常驻通知，可从通知或设置中停止采集；会监听并每 5 秒检查开启采集后的新增短信；不会自动扫描全部历史短信。")
                .setNegativeButton("取消", null).setPositiveButton("同意并开启") { _, _ ->
                    if (checkSelfPermission(Manifest.permission.RECEIVE_SMS) != PackageManager.PERMISSION_GRANTED || checkSelfPermission(Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) requestPermissions(arrayOf(Manifest.permission.RECEIVE_SMS, Manifest.permission.READ_SMS), 10)
                    else enableCollection()
                }.show()
        }
        val realtime = Switch(this).apply {
            text = "持续实时采集（较高耗电）"; textSize = 13f; isChecked = settings.realtimeMode; setTextColor(ink)
        }
        permission.addSpaced(realtime, 12)
        permission.addSpaced(text("开启后，采集期间保持 CPU 唤醒，让息屏时的短信库检查和上传继续执行。不会点亮屏幕，但会增加耗电，建议专用手机接电使用；关闭此模式或停止采集立即释放。系统厂商仍可能限制网络或冻结应用。", 11f, muted), 8)
        realtime.setOnCheckedChangeListener { _, checked ->
            if (!checked) {
                settings.realtimeMode = false; SmsCaptureService.start(this); toast("实时模式已关闭，息屏检查可能延迟")
            } else {
                realtime.isChecked = false
                AlertDialog.Builder(this).setTitle("启用持续实时采集").setMessage("采集开启期间会保持 CPU 唤醒，增加耗电和发热。建议专用短信手机接电使用。可随时关闭，停止采集也会立即释放唤醒锁。")
                    .setNegativeButton("取消", null).setPositiveButton("开启实时模式") { _, _ ->
                        settings.realtimeMode = true; settings.maxScanGapMillis = 0
                        SmsCaptureService.start(this); toast("实时模式已开启，请保留自启动和后台不受限制设置"); render()
                    }.show()
            }
        }
        val smsGranted = checkSelfPermission(Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED
        permission.addSpaced(text("短信接收权限：${if (smsGranted) "已授权" else "未授权"}", 12f, if (smsGranted) Color.rgb(47, 158, 123) else muted), 14)
        permission.addSpaced(text("后台采集服务：${if (SmsCaptureService.running) "运行中（常驻通知）" else "未运行"}", 12f, muted), 10)
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            permission.addSpaced(button("允许后台采集通知") { requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 12) }, 11)
        }
        permission.addSpaced(button("打开应用权限设置") { open(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName"))) }, 12)
        val readGranted = checkSelfPermission(Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED
        permission.addSpaced(text("历史短信读取权限：${if (readGranted) "已授权" else "补传时申请"}", 12f, muted), 10)
        if (Build.MANUFACTURER.lowercase(Locale.ROOT) in listOf("xiaomi", "redmi", "poco")) {
            permission.addSpaced(text("小米 / Redmi / POCO 还需在「其他权限」中将「通知类短信」设为「始终允许」。普通短信权限已授权，也可能读不到验证码短信；此额外权限需在系统页面确认。", 11f, muted), 12)
            permission.addSpaced(button("设置小米通知类短信权限") { openVendorSmsPermissions() }, 11)
            val noRestrict = runCatching { Settings.System.getString(contentResolver, "MILLET_NO_RESTRICT_APP") }.getOrNull()
            val entries = noRestrict?.split(',')
            val vendorState = when {
                entries == null -> "无法读取，请在系统设置确认"
                entries.any { it == packageName } -> "名单中有本应用（仍需实测后台行为）"
                entries.any { it.trim() == packageName } -> "名单包名含多余空格，可能未生效"
                else -> "未找到本应用，请设为不限制"
            }
            permission.addSpaced(text("小米应用省电策略：$vendorState", 11f, muted), 10)
            permission.addSpaced(button("检查小米应用省电策略") {
                toast("请检查应用省电策略 / 应用智能省电为不限制；这与 Android 电池优化白名单不同")
                open(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName")))
            }, 11)
        }
        val exempt = (getSystemService(POWER_SERVICE) as PowerManager).isIgnoringBatteryOptimizations(packageName)
        permission.addSpaced(text("后台电池限制：${if (exempt) "已允许不受限制" else "可能限制后台执行"}", 12f, muted), 17)
        permission.addSpaced(button("设置后台运行 / 电池优化") { open(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)) }, 11)
        permission.addSpaced(button("设置自动启动权限") { openAutostart() }, 11)
        permission.addSpaced(text("在系统设置中允许自启动、后台活动，并根据手机厂商要求锁定最近任务。小米请允许自启动，并保留通知类短信权限。收到广播后立即尝试上传；网络不可用时排队重试。系统强行停止 App 后，需手动重新打开；另有短信库监听及每 5 秒检查作为备用采集，需要短信读取权限；手机完全休眠或系统冻结仍可能延迟。", 11f, muted), 13)
        content.addSpaced(permission, 17)
        val history = card(); history.addView(text("历史短信补传", 16f, ink, true)); history.addSpaced(text("仅在点击并授权后扫描过去 24 小时的最多 500 条短信，筛选验证码并加入去重队列。", 11f, muted), 9)
        history.addSpaced(button("导入最近 24 小时验证码") {
            if (!settings.enabled) { toast("请先开启采集"); return@button }
            AlertDialog.Builder(this).setTitle("读取历史短信").setMessage("允许读取最近 24 小时短信并筛选验证码上传到当前服务中心？")
                .setNegativeButton("取消", null).setPositiveButton("读取并导入") { _, _ ->
                    if (checkSelfPermission(Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) requestPermissions(arrayOf(Manifest.permission.READ_SMS), 11)
                    else importHistory()
                }.show()
        }, 15)
        if (settings.lastImportResult.isNotBlank()) history.addSpaced(text(settings.lastImportResult, 11f, muted), 12)
        content.addSpaced(history, 17)
    }
    private fun enableCollection() {
        settings.enabled = true; SmsCaptureService.start(this); UploadWorker.schedule(this); UploadWorker.enqueue(this, force = true)
        toast("验证码采集已开启，后台采集期间会显示常驻通知"); render()
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 12)
    }
    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 12) { toast(if (grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) "后台采集通知已允许" else "通知未允许，可在系统设置中开启"); render(); return }
        if (grantResults.isEmpty() || grantResults.any { it != PackageManager.PERMISSION_GRANTED }) { toast("请允许短信接收和读取权限，以启用后台备用采集"); return }
        if (requestCode == 10) enableCollection() else if (requestCode == 11) importHistory()
    }
    private fun importHistory() {
        toast("正在扫描最近短信…")
        Background.executor.execute {
            val result = try {
                var scanned = 0
                var matched = 0
                var added = 0
                val keywords = settings.extraKeywords
                QueueDb(this).use { db ->
                    val cursor = contentResolver.query(
                        Telephony.Sms.CONTENT_URI, arrayOf("address", "body", "date"),
                        "date >= ?", arrayOf((System.currentTimeMillis() - 86400000).toString()), "date DESC"
                    ) ?: throw IllegalStateException("SMS provider unavailable")
                    cursor.use { c ->
                        while (scanned < 500 && settings.enabled && c.moveToNext()) {
                            scanned++
                            val body = c.getString(1) ?: ""
                            if (QueueDb.isCandidate(body, keywords)) {
                                matched++
                                if (db.enqueue(c.getString(0) ?: "unknown", body, c.getLong(2), keywords)) added++
                            }
                        }
                    }
                }
                UploadWorker.enqueue(this, force = true)
                val counts = "读取 $scanned 条，命中 $matched 条，新增 $added 条，重复 ${matched - added} 条。"
                val hint = when {
                    !settings.enabled -> "采集已关闭，扫描已停止。"
                    scanned == 0 -> "未读到最近 24 小时的短信；若手机中确实有短信，请检查系统短信权限及厂商额外权限。"
                    matched == 0 -> "没有命中验证码关键词和数字，请检查短信内容或配置额外关键词；厂商权限也可能隐藏部分短信。"
                    added == 0 -> "匹配短信已在本地队列中，无需重复导入；请在接收统计查看上传状态。"
                    else -> "已加入上传队列，请在接收统计查看上传状态。"
                }
                "$counts\n$hint"
            } catch (_: SecurityException) {
                "读取历史短信被拒绝，请检查短信读取权限及厂商额外权限。"
            } catch (_: Exception) {
                "历史短信补传失败，请检查短信权限与本地存储状态。"
            }
            settings.lastImportResult = SimpleDateFormat("MM-dd HH:mm", Locale.getDefault()).format(Date()) + "\n" + result
            runOnUiThread { toast(result); render() }
        }
    }
    private fun openVendorSmsPermissions() {
        try {
            startActivity(Intent().setComponent(ComponentName("com.miui.securitycenter", "com.miui.permcenter.permissions.PermissionsEditorActivity"))
                .putExtra("extra_pkgname", packageName))
        } catch (_: Exception) {
            toast("请在应用设置 → 其他权限中允许通知类短信")
            open(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName")))
        }
    }
    private fun openAutostart() {
        val components = listOf(
            ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"),
            ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"),
            ComponentName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity"),
            ComponentName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity")
        )
        for (component in components) { try { startActivity(Intent().setComponent(component)); return } catch (_: Exception) { /* Try the next vendor activity. */ } }
        toast("请在应用设置或手机管家中允许自启动与后台活动")
        open(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName")))
    }
    private fun open(intent: Intent) { try { startActivity(intent) } catch (_: Exception) { toast("此设备不支持该设置入口，请在系统设置中手动配置") } }
    private fun toast(message: String) { Toast.makeText(this, message, Toast.LENGTH_LONG).show() }
}
