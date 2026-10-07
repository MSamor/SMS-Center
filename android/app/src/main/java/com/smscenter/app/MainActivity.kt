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
    override fun onResume() { super.onResume(); if (::settings.isInitialized) render(); mainHandler.postDelayed(refresh, 5000) }
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
        state.addSpaced(text(if (settings.enabled) "验证码短信会加密入队，网络可用时自动上传。" else "先配置服务地址和上传 Token，再授权短信接收。", 12f, muted), 8)
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
            if (!enabled) { settings.enabled = false; UploadWorker.stop(this); toast("采集已关闭"); return@setOnCheckedChangeListener }
            toggle.isChecked = false
            if (settings.server.isBlank() || runCatching { settings.token }.getOrDefault("").isBlank()) { toast("请先保存服务地址和 Token"); return@setOnCheckedChangeListener }
            AlertDialog.Builder(this).setTitle("授权验证码采集").setMessage("开启后，App 会接收此手机的新短信，筛选包含验证码关键词的短信，加密保存待上传内容并发送到你配置的服务中心。仅对你本人拥有或已获得授权的手机启用。\n\n可随时关闭采集；不会自动读取历史短信。")
                .setNegativeButton("取消", null).setPositiveButton("同意并开启") { _, _ ->
                    if (checkSelfPermission(Manifest.permission.RECEIVE_SMS) != PackageManager.PERMISSION_GRANTED) requestPermissions(arrayOf(Manifest.permission.RECEIVE_SMS), 10)
                    else enableCollection()
                }.show()
        }
        val smsGranted = checkSelfPermission(Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED
        permission.addSpaced(text("短信接收权限：${if (smsGranted) "已授权" else "未授权"}", 12f, if (smsGranted) Color.rgb(47, 158, 123) else muted), 14)
        permission.addSpaced(button("打开应用权限设置") { open(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName"))) }, 12)
        val exempt = (getSystemService(POWER_SERVICE) as PowerManager).isIgnoringBatteryOptimizations(packageName)
        permission.addSpaced(text("后台电池限制：${if (exempt) "已允许不受限制" else "可能限制后台执行"}", 12f, muted), 17)
        permission.addSpaced(button("设置后台运行 / 电池优化") { open(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)) }, 11)
        permission.addSpaced(button("设置自动启动权限") { openAutostart() }, 11)
        permission.addSpaced(text("在系统设置中允许自启动、后台活动，并根据手机厂商要求锁定最近任务。系统强行停止 App 后，需手动重新打开；后台上传时间由 Android 调度，不能保证实时。", 11f, muted), 13)
        content.addSpaced(permission, 17)
        val history = card(); history.addView(text("历史短信补传", 16f, ink, true)); history.addSpaced(text("仅在点击并授权后扫描过去 24 小时的最多 500 条短信，筛选验证码并加入去重队列。", 11f, muted), 9)
        history.addSpaced(button("导入最近 24 小时验证码") {
            if (!settings.enabled) { toast("请先开启采集"); return@button }
            AlertDialog.Builder(this).setTitle("读取历史短信").setMessage("允许读取最近 24 小时短信并筛选验证码上传到当前服务中心？")
                .setNegativeButton("取消", null).setPositiveButton("读取并导入") { _, _ ->
                    if (checkSelfPermission(Manifest.permission.READ_SMS) != PackageManager.PERMISSION_GRANTED) requestPermissions(arrayOf(Manifest.permission.READ_SMS), 11)
                    else importHistory()
                }.show()
        }, 15); content.addSpaced(history, 17)
    }
    private fun enableCollection() { settings.enabled = true; UploadWorker.schedule(this); UploadWorker.enqueue(this, force = true); toast("验证码采集已开启"); render() }
    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (grantResults.firstOrNull() != PackageManager.PERMISSION_GRANTED) { toast("权限未授予，请在系统设置中检查短信权限"); return }
        if (requestCode == 10) enableCollection() else if (requestCode == 11) importHistory()
    }
    private fun importHistory() {
        toast("正在扫描最近短信…")
        Background.executor.execute {
            try {
                var added = 0
                QueueDb(this).use { db ->
                    contentResolver.query(Telephony.Sms.CONTENT_URI, arrayOf("address", "body", "date"), "date >= ?", arrayOf((System.currentTimeMillis() - 86400000).toString()), "date DESC")?.use { c ->
                        var scanned = 0
                        while (scanned < 500 && c.moveToNext() && settings.enabled) { scanned++; if (db.enqueue(c.getString(0) ?: "unknown", c.getString(1) ?: "", c.getLong(2), settings.extraKeywords)) added++ }
                    }
                }
                UploadWorker.enqueue(this, force = true); runOnUiThread { toast("已导入 $added 条验证码候选短信"); render() }
            } catch (_: Exception) { runOnUiThread { toast("读取历史短信失败，请检查 READ_SMS 权限") } }
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
