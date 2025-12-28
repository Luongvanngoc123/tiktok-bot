import json
import time
import sys
import os
import shutil
import threading
import asyncio
import datetime
import requests
import math
import traceback
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes, CallbackQueryHandler, MessageHandler, filters, ConversationHandler
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import StaleElementReferenceException, TimeoutException
from selenium.webdriver.common.action_chains import ActionChains

# --- KIỂM TRA THƯ VIỆN ---
try:
    from tiktok_captcha_solver import SeleniumSolver
except ImportError:
    print("⚠️ LỖI: Chưa cài thư viện. Chạy: pip install tiktok-captcha-solver requests selenium python-telegram-bot")
    sys.exit()

# ==============================================================================
# CẤU HÌNH & DỮ LIỆU
# ==============================================================================
TELEGRAM_BOT_TOKEN = "8214738582:AAGvdLWGaddpmwG8qIBTiSDP34iwWles58Y" 
# Sửa đường dẫn để chạy được trên cả Linux và Windows
BASE_DIR = os.path.abspath("TikTok_Profiles") 
SETTINGS_FILE = os.path.join(BASE_DIR, "settings.json")

# Các trạng thái hội thoại
STATE_NEW_PROFILE = 1; STATE_SET_API = 2; STATE_LOGIN_USER = 3; STATE_LOGIN_PASS = 4
STATE_MSG_CONTENT = 5; STATE_ENTER_OTP = 6; STATE_AUTO_MSG = 7; STATE_ADD_CREDIT = 9

# --- BIẾN TOÀN CỤC ---
active_sessions = {} 
user_sessions = {}
running_browsers = {} 

# --- HELPER FUNCTIONS ---
def load_settings():
    if not os.path.exists(BASE_DIR): os.makedirs(BASE_DIR)
    if os.path.exists(SETTINGS_FILE):
        try: with open(SETTINGS_FILE, "r") as f: return json.load(f)
        except: pass
    return {"api_key": "", "auto_msg": "Hello", "scheduler": False, "scheduler_profiles": [], "credits": 25} 

def save_settings(data):
    curr = load_settings(); curr.update(data)
    with open(SETTINGS_FILE, "w") as f: json.dump(curr, f)

def deduct_credit():
    s = load_settings(); current = s.get("credits", 25)
    if current > 0:
        save_settings({"credits": current - 1})
        return True, current - 1
    return False, 0

def get_profiles():
    if not os.path.exists(BASE_DIR): return []
    return [name for name in os.listdir(BASE_DIR) if os.path.isdir(os.path.join(BASE_DIR, name))]

def create_profile_folder(name):
    path = os.path.join(BASE_DIR, name)
    if not os.path.exists(path): os.makedirs(path); return True
    return False

def delete_profile_folder(name):
    path = os.path.join(BASE_DIR, name)
    if name in running_browsers: return False
    if os.path.exists(path): shutil.rmtree(path); return True
    return False

def get_user_db_path(profile_name): return os.path.join(BASE_DIR, profile_name, "users.json")
def load_user_db(profile_name):
    path = get_user_db_path(profile_name)
    if os.path.exists(path):
        try: with open(path, "r", encoding="utf-8") as f: return json.load(f)
        except: pass
    return []
def save_user_db(profile_name, data):
    path = get_user_db_path(profile_name)
    with open(path, "w", encoding="utf-8") as f: json.dump(data, f, ensure_ascii=False, indent=4)

def is_driver_alive(driver):
    try: driver.title; return True
    except: return False

def toggle_scheduler_profile_setting(name):
    s = load_settings(); profs = s.get("scheduler_profiles", [])
    if name in profs: profs.remove(name)
    else: profs.append(name)
    save_settings({"scheduler_profiles": profs})

# ==============================================================================
# BACKEND: XỬ LÝ SELENIUM (VPS OPTIMIZED)
# ==============================================================================
class TikTokBackend:
    def __init__(self, chat_id, bot_app, loop, profile_name=None):
        self.driver = None; self.wait = None
        self.chat_id = chat_id; self.bot_app = bot_app; self.loop = loop
        self.profile_name = profile_name
        self.sadcaptcha = None; self.stop_flag = False; self.otp_code = None 

    def log(self, text):
        prefix = f"[{self.profile_name}] " if self.profile_name else ""
        print(f"[{self.chat_id}] {prefix}{text}")
        if self.bot_app and self.loop and self.chat_id:
            try:
                asyncio.run_coroutine_threadsafe(self.bot_app.bot.send_message(chat_id=self.chat_id, text=f"{prefix}{text}"), self.loop)
            except: pass

    def open_browser(self, profile_name):
        self.profile_name = profile_name
        if profile_name in running_browsers:
            if is_driver_alive(running_browsers[profile_name]):
                self.driver = running_browsers[profile_name]
                self.wait = WebDriverWait(self.driver, 30)
                self.log(f"🖥 Kết nối lại: {profile_name}")
                return True
            else: del running_browsers[profile_name]

        path = os.path.join(BASE_DIR, profile_name)
        if not os.path.exists(path): os.makedirs(path)
        
        opts = Options()
        opts.add_argument(f"--user-data-dir={path}")
        
        # --- CẤU HÌNH QUAN TRỌNG CHO VPS LINUX ---
        opts.add_argument("--headless=new")       # Chạy ẩn không cần màn hình
        opts.add_argument("--no-sandbox")         # Bắt buộc cho quyền root
        opts.add_argument("--disable-dev-shm-usage") # Tránh lỗi crash RAM
        opts.add_argument("--disable-gpu")
        opts.add_argument("--window-size=1920,1080") # Giả lập màn hình to
        
        opts.add_argument("--disable-notifications")
        opts.add_argument("--disable-blink-features=AutomationControlled")
        opts.add_experimental_option("excludeSwitches", ["enable-automation"])
        
        try:
            self.driver = webdriver.Chrome(options=opts)
            self.wait = WebDriverWait(self.driver, 30)
            running_browsers[profile_name] = self.driver
            
            s = load_settings()
            if s.get("api_key"):
                try: self.sadcaptcha = SeleniumSolver(self.driver, s["api_key"])
                except: pass
            
            self.log(f"🖥 Đã mở Chrome (Headless): {profile_name}")
            return True
        except Exception as e:
            self.log(f"❌ Lỗi Chrome: {e}"); return False

    def close_current_browser(self):
        if self.profile_name and self.profile_name in running_browsers:
            try: running_browsers[self.profile_name].quit()
            except: pass
            del running_browsers[self.profile_name]
            self.log(f"🛑 Đã tắt Chrome: {self.profile_name}")
            return True
        return False

    def wait_for_page_load(self, timeout=30):
        try:
            WebDriverWait(self.driver, timeout).until(lambda d: d.execute_script("return document.readyState") == "complete")
            time.sleep(2)
        except: pass

    def check_captcha(self):
        try:
            if self.sadcaptcha:
                if len(self.driver.find_elements(By.XPATH, "//div[contains(@class,'captcha-container')]|//div[@id='captcha_container']")) > 0:
                    success, remain = deduct_credit()
                    if success:
                        self.log(f"🧩 Giải Captcha (Credits: {remain})")
                        self.sadcaptcha.solve_captcha_if_present()
                        self.wait_for_page_load()
                        return True
                    else:
                        self.log("⚠️ HẾT CREDIT! Nạp thêm đi.")
                        return False
        except: pass
        return False

    def is_logged_in(self):
        try:
            # Check kỹ các dấu hiệu chưa đăng nhập
            if len(self.driver.find_elements(By.XPATH, "//button[@data-e2e='top-login-button'] | //a[@href='/login'] | //button[contains(text(), 'Log in')]")) > 0:
                return False
            # Check dấu hiệu đã đăng nhập
            if len(self.driver.find_elements(By.XPATH, "//div[@data-e2e='inbox-icon'] | //a[contains(@href,'/messages')] | //a[contains(@href, '/@')]")) > 0:
                return True
        except: pass
        return False

    def login(self, user, pwd):
        if not self.driver: self.log("❌ Chrome chưa mở!"); return
        self.driver.get("https://www.tiktok.com"); self.wait_for_page_load()
        if self.is_logged_in(): self.log("✅ Đã Login sẵn."); return

        try:
            self.log("⌨️ Vào trang đăng nhập..."); self.driver.get("https://www.tiktok.com/login/phone-or-email/email")
            self.wait_for_page_load(); self.check_captcha()
            
            u_box = WebDriverWait(self.driver, 15).until(EC.visibility_of_element_located((By.XPATH, "//input[@name='username']")))
            u_box.click(); u_box.clear(); u_box.send_keys(user); time.sleep(1)

            p_box = self.driver.find_element(By.XPATH, "//input[@type='password']")
            p_box.click(); p_box.clear(); p_box.send_keys(pwd); time.sleep(1)

            self.driver.find_element(By.XPATH, "//button[@type='submit']").click()
            self.log("⏳ Đang xác thực (60s)...")
            
            for i in range(60):
                if i % 5 == 0: self.check_captcha()
                if self.is_logged_in(): self.log("✅ Login thành công!"); return
                
                if self.driver.find_elements(By.XPATH, "//input[@autocomplete='one-time-code']"):
                    self.log("⚠️ CẦN OTP! Nhập mã ngay."); self.otp_code = None; w = 0
                    while not self.otp_code and w < 180: 
                        if self.stop_flag: return
                        time.sleep(1); w += 1
                    if self.otp_code: 
                        try: self.driver.find_element(By.XPATH, "//input[@autocomplete='one-time-code']").send_keys(self.otp_code); time.sleep(3); self.wait_for_page_load()
                        except: pass
                    else: return
                time.sleep(1)
            self.log("⚠️ Timeout.")
        except Exception as e: self.log(f"❌ Lỗi Login: {e}")

    def scan(self):
        if not self.driver: self.log("❌ Chrome chưa mở!"); return
        self.log("📂 Đang vào tin nhắn..."); self.driver.get("https://www.tiktok.com/messages"); self.wait_for_page_load(); self.check_captcha()
        self.log("📜 Đang cuộn trang..."); 
        for _ in range(5): self.driver.execute_script("window.scrollBy(0,500);"); time.sleep(1.5); self.check_captcha()
        
        els = self.driver.find_elements(By.XPATH, "//a[contains(@href, '/@')]")
        current_db = load_user_db(self.profile_name); db_map = {u['url']: u for u in current_db}; new_c = 0
        for el in els:
            try:
                href = el.get_attribute("href")
                if not href: continue
                u = href.split("@")[-1].split("?")[0]
                if u in ["tiktok", "tiktok_vietnam"]: continue
                try: disp = el.text.replace("\n", " ").strip() or u
                except: disp = u
                if href not in db_map: db_map[href] = {"url": href, "display": disp, "selected": False}; new_c += 1
                else: db_map[href]["display"] = disp
            except: continue
        save_user_db(self.profile_name, list(db_map.values())); self.log(f"✅ Quét xong. Tổng: {len(db_map)}. Mới: {new_c}")

    def send(self, content, mode='selected'):
        if not self.driver: self.log("❌ Chrome chưa mở!"); return
        users = load_user_db(self.profile_name)
        targets = [u for u in users if u.get('selected')] if mode == 'selected' else users
        if not targets: self.log("❌ Chưa chọn User."); return
        self.log(f"🚀 Bắt đầu gửi ({len(targets)} người)...")
        
        btn_xpaths = ["//button[@data-e2e='chat-button']", "//button[@data-e2e='message-button']", "//button[contains(text(),'Tin nhắn')]", "//button[contains(text(),'Message')]"]

        for i, t in enumerate(targets):
            if self.stop_flag: break
            try:
                self.log(f"➡️ Vào: {t['display']}")
                self.driver.get(t['url']); self.wait_for_page_load(); self.check_captcha()
                
                found_btn = False
                for bx in btn_xpaths:
                    try:
                        btn = WebDriverWait(self.driver, 5).until(EC.element_to_be_clickable((By.XPATH, bx)))
                        try:
                            # Dùng ActionChains để click chuẩn trên VPS
                            ActionChains(self.driver).move_to_element(btn).click().perform()
                        except:
                            self.driver.execute_script("arguments[0].click();", btn)
                        found_btn = True; break
                    except: pass
                
                if not found_btn: continue

                time.sleep(2)
                box_found = False
                try:
                    box = WebDriverWait(self.driver, 10).until(EC.element_to_be_clickable((By.XPATH, "//div[@contenteditable='true']")))
                    box.click(); time.sleep(0.5); box.send_keys(content); time.sleep(0.5); box.send_keys(Keys.ENTER)
                    box_found = True
                except:
                    try: 
                        box = self.driver.find_element(By.TAG_NAME, "textarea")
                        box.send_keys(content); box.send_keys(Keys.ENTER); box_found = True
                    except: pass

                if box_found:
                    if (i+1)%5==0: self.log(f"✅ Đã gửi {i+1}/{len(targets)}...")

            except: pass
            if len(targets)>1: time.sleep(3)
        self.log("🏁 Hoàn thành chiến dịch.")

# ==============================================================================
# SCHEDULER & MENUS
# ==============================================================================
def run_scheduler_job(app, loop):
    settings = load_settings(); msg = settings.get("auto_msg", "Hi")
    auto_profs = settings.get("scheduler_profiles", [])
    if not auto_profs: return
    admin_id = list(user_sessions.keys())[0] if user_sessions else None
    
    for prof in auto_profs:
        bot = TikTokBackend(chat_id=admin_id, bot_app=app, loop=loop, profile_name=prof)
        if bot.open_browser(prof):
            bot.scan(); bot.send(msg, 'selected'); bot.close_current_browser()
        time.sleep(10)

def run_scheduler_loop(app, loop):
    times = ["00:00", "06:00", "12:00", "20:00", "22:00"]
    while True:
        if load_settings().get("scheduler", False):
            if datetime.datetime.now().strftime("%H:%M") in times:
                run_scheduler_job(app, loop); time.sleep(65)
        time.sleep(10)

def get_main_menu_keyboard():
    settings = load_settings(); api_stt = "✅ Đã có" if settings.get("api_key") else "⚠️ Chưa có"
    credits = settings.get("credits", 25)
    kb = [
        [InlineKeyboardButton(f"💰 Credits: {credits}", callback_data='menu_add_credit')],
        [InlineKeyboardButton(f"🔑 API Key ({api_stt})", callback_data='menu_api'), InlineKeyboardButton("➕ Tạo Profile", callback_data='menu_new_prof')],
        [InlineKeyboardButton("📂 DANH SÁCH PROFILE", callback_data='menu_list_profiles')],
        [InlineKeyboardButton("⚙️ Cài đặt Auto", callback_data='menu_auto_settings')]
    ]
    return InlineKeyboardMarkup(kb)

def get_profiles_list_keyboard():
    profs = get_profiles(); kb = []
    for p in profs:
        icon = "🟢" if p in running_browsers and is_driver_alive(running_browsers[p]) else "🔴"
        kb.append([InlineKeyboardButton(f"{icon} {p}", callback_data=f"select_prof_{p}")])
    kb.append([InlineKeyboardButton("🔙 Menu Chính", callback_data='back_main')])
    return InlineKeyboardMarkup(kb)

def get_single_profile_keyboard(prof_name):
    s = load_settings(); auto_icon = "✅ Bật" if prof_name in s.get("scheduler_profiles", []) else "❌ Tắt"
    is_on = prof_name in running_browsers and is_driver_alive(running_browsers[prof_name])
    c_act = "Tắt Chrome" if is_on else "Mở Chrome"; c_data = "act_close_chrome" if is_on else "act_open_chrome"
    kb = [
        [InlineKeyboardButton(f"🖥 {c_act}", callback_data=c_data)],
        [InlineKeyboardButton("🔄 Login", callback_data='act_login'), InlineKeyboardButton("✍️ OTP", callback_data='act_otp')],
        [InlineKeyboardButton("📂 Quét User", callback_data='act_scan'), InlineKeyboardButton("👥 Chọn User", callback_data='act_select_users')],
        [InlineKeyboardButton("🚀 Gửi (Đã chọn)", callback_data='act_send_selected'), InlineKeyboardButton("📝 Auto Msg", callback_data='act_set_msg')],
        [InlineKeyboardButton(f"⏰ Auto: {auto_icon}", callback_data='act_toggle_auto'), InlineKeyboardButton("🗑 Xóa", callback_data='act_delete')],
        [InlineKeyboardButton("🔙 Danh Sách", callback_data='menu_list_profiles')]
    ]
    return InlineKeyboardMarkup(kb)

# ==============================================================================
# TELEGRAM HANDLERS
# ==============================================================================
active_backends = {}

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    api = load_settings().get("api_key", "Chưa có")
    await update.message.reply_text(f"🤖 **BOT V18.1** (Linux VPS)\n🔑 API: `{api}`\nChọn chức năng:", reply_markup=get_main_menu_keyboard(), parse_mode='Markdown')
    return ConversationHandler.END

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query; await query.answer(); cid = query.message.chat.id; data = query.data
    loop = asyncio.get_running_loop()
    
    if cid not in user_sessions: user_sessions[cid] = {}
    curr_prof = user_sessions[cid].get('current_profile')
    
    if cid not in active_sessions: active_sessions[cid] = TikTokBackend(cid, context.application, loop, curr_prof)
    else: active_sessions[cid].profile_name = curr_prof
    backend = active_sessions[cid]

    if data == 'back_main': await query.edit_message_text("🤖 **MENU CHÍNH:**", reply_markup=get_main_menu_keyboard(), parse_mode='Markdown'); return
    if data == 'menu_list_profiles': await query.edit_message_text("📂 **PROFILE:**", reply_markup=get_profiles_list_keyboard(), parse_mode='Markdown'); return
    if data == 'menu_new_prof': await context.bot.send_message(cid, "✍️ Tên Profile:"); return STATE_NEW_PROFILE
    if data == 'menu_api': await context.bot.send_message(cid, "✍️ API Key:"); return STATE_SET_API
    if data == 'menu_add_credit': await context.bot.send_message(cid, "✍️ Nhập số Credit thêm:"); return STATE_ADD_CREDIT

    if data.startswith("select_prof_"):
        prof = data.replace("select_prof_", "")
        user_sessions[cid]['current_profile'] = prof
        backend.profile_name = prof
        await query.edit_message_text(f"👤 **{prof}**", reply_markup=get_single_profile_keyboard(prof), parse_mode='Markdown'); return

    if data == 'act_open_chrome':
        if not curr_prof: await context.bot.send_message(cid, "⚠️ Chọn lại Profile!"); return
        await context.bot.send_message(cid, f"⏳ Mở (Headless): {curr_prof}...")
        threading.Thread(target=backend.open_browser, args=(curr_prof,)).start()
        await asyncio.sleep(4); await context.bot.send_message(cid, "👇 Menu:", reply_markup=get_single_profile_keyboard(curr_prof)); return

    if data == 'act_close_chrome': backend.close_current_browser(); await query.edit_message_text(f"🛑 Tắt: {curr_prof}", reply_markup=get_single_profile_keyboard(curr_prof)); return
    if data == 'act_login': await context.bot.send_message(cid, "✍️ User:"); return STATE_LOGIN_USER
    if data == 'act_otp': await context.bot.send_message(cid, "📧 OTP:"); return STATE_ENTER_OTP
    if data == 'act_scan': await context.bot.send_message(cid, "⏳ Quét..."); threading.Thread(target=backend.scan).start(); return
    if data == 'act_send_selected': await context.bot.send_message(cid, "✍️ Nội dung:"); return STATE_MSG_CONTENT
    if data == 'act_set_msg': await context.bot.send_message(cid, "✍️ Nội dung Auto:"); return STATE_AUTO_MSG
    if data == 'act_toggle_auto': toggle_scheduler_profile_setting(curr_prof); await query.edit_message_text(f"👤 **{curr_prof}**", reply_markup=get_single_profile_keyboard(curr_prof), parse_mode='Markdown'); return
    if data == 'act_delete': delete_profile_folder(curr_prof); await query.edit_message_text("✅ Xóa xong.", reply_markup=get_profiles_list_keyboard()); return
    
    if data == 'act_select_users': await show_user_page(query, curr_prof, 0); return
    if data.startswith("tog_usr_") or data.startswith("pg_usr_"):
        parts=data.split("_"); action=parts[0]+"_"+parts[1]
        if action=="tog_usr":
            idx=int(parts[2]); page=int(parts[3]); users=load_user_db(curr_prof)
            if 0<=idx<len(users): users[idx]['selected'] = not users[idx].get('selected', False); save_user_db(curr_prof, users); await show_user_page(query, curr_prof, page)
        elif action=="pg_usr": await show_user_page(query, curr_prof, int(parts[2]))
        return

    if data == 'menu_auto_settings':
        stt = "✅ BẬT" if load_settings().get("scheduler") else "❌ TẮT"
        kb = [[InlineKeyboardButton(f"Tổng Auto: {stt}", callback_data='glob_toggle')], [InlineKeyboardButton("🔙 Menu", callback_data='back_main')]]
        await query.edit_message_text("⚙️ **AUTO SETTINGS:**", reply_markup=InlineKeyboardMarkup(kb), parse_mode='Markdown'); return
    if data == 'glob_toggle':
        s=load_settings(); s['scheduler'] = not s.get("scheduler", False); save_settings(s); await button_handler(update, context); return

async def show_user_page(query, prof, page):
    users = load_user_db(prof)
    if not users: await query.edit_message_text("⚠️ List trống.", reply_markup=get_single_profile_keyboard(prof)); return
    PER=10; total=math.ceil(len(users)/PER); start=page*PER; end=start+PER
    kb = []
    for i, u in enumerate(users[start:end]):
        icon = "✅" if u.get('selected') else "❌"; nm = u['display'][:15]
        kb.append([InlineKeyboardButton(f"{icon} {nm}", callback_data=f"tog_usr_{start+i}_{page}")])
    row = []
    if page>0: row.append(InlineKeyboardButton("⬅️", callback_data=f"pg_usr_{page-1}"))
    row.append(InlineKeyboardButton(f"{page+1}/{total}", callback_data="noop"))
    if page<total-1: row.append(InlineKeyboardButton("➡️", callback_data=f"pg_usr_{page+1}"))
    kb.append(row); kb.append([InlineKeyboardButton("🔙 Quay lại Profile", callback_data=f"select_prof_{prof}")])
    await query.edit_message_text(f"👥 **CHỌN USER: {prof}**", reply_markup=InlineKeyboardMarkup(kb), parse_mode='Markdown')

# --- INPUT HANDLERS ---
async def input_new_prof(u: Update, c: ContextTypes.DEFAULT_TYPE): create_profile_folder(u.message.text.strip()); await u.message.reply_text("✅ Tạo xong.", reply_markup=get_main_menu_keyboard()); return ConversationHandler.END
async def input_api(u: Update, c: ContextTypes.DEFAULT_TYPE): save_settings({"api_key": u.message.text.strip()}); await u.message.reply_text("✅ Saved.", reply_markup=get_main_menu_keyboard()); return ConversationHandler.END
async def input_add_credit(u: Update, c: ContextTypes.DEFAULT_TYPE):
    try: s = load_settings(); s["credits"] = s.get("credits", 25) + int(u.message.text.strip()); save_settings(s); await u.message.reply_text(f"✅ Credit: {s['credits']}", reply_markup=get_main_menu_keyboard())
    except: await u.message.reply_text("❌ Lỗi số.")
    return ConversationHandler.END
async def input_user(u: Update, c: ContextTypes.DEFAULT_TYPE): 
    cid = u.message.chat.id; 
    if cid not in user_sessions: user_sessions[cid] = {}
    user_sessions[cid]['login_user'] = u.message.text.strip(); await u.message.reply_text("✍️ Pass:"); return STATE_LOGIN_PASS
async def input_pass(u: Update, c: ContextTypes.DEFAULT_TYPE):
    cid = u.message.chat.id; pwd = u.message.text.strip()
    if cid in active_sessions:
        await u.message.reply_text("⏳ Login...")
        threading.Thread(target=active_sessions[cid].login, args=(user_sessions[cid]['login_user'], pwd)).start()
    return ConversationHandler.END
async def input_otp(u: Update, c: ContextTypes.DEFAULT_TYPE): active_sessions[u.message.chat.id].otp_code = u.message.text.strip(); await u.message.reply_text("👌 Đã gửi mã."); return ConversationHandler.END
async def input_msg(u: Update, c: ContextTypes.DEFAULT_TYPE):
    cid = u.message.chat.id
    if cid in active_sessions:
        await u.message.reply_text("🚀 Gửi...")
        threading.Thread(target=active_sessions[cid].send, args=(u.message.text.strip(), 'selected')).start()
    return ConversationHandler.END
async def input_auto_msg(u: Update, c: ContextTypes.DEFAULT_TYPE): save_settings({"auto_msg": u.message.text.strip()}); await u.message.reply_text("✅ Saved."); return ConversationHandler.END
async def cancel(u: Update, c: ContextTypes.DEFAULT_TYPE): await u.message.reply_text("Hủy.", reply_markup=get_main_menu_keyboard()); return ConversationHandler.END

if __name__ == '__main__':
    try:
        print("🤖 Bot started..."); app = ApplicationBuilder().token(TELEGRAM_BOT_TOKEN).build()
        loop = asyncio.new_event_loop()
        threading.Thread(target=run_scheduler_loop, args=(app, loop), daemon=True).start()
        conv = ConversationHandler(entry_points=[CommandHandler("start", start), CallbackQueryHandler(button_handler)],
            states={
                STATE_NEW_PROFILE: [MessageHandler(filters.TEXT, input_new_prof)],
                STATE_SET_API: [MessageHandler(filters.TEXT, input_api)],
                STATE_ADD_CREDIT: [MessageHandler(filters.TEXT, input_add_credit)],
                STATE_LOGIN_USER: [MessageHandler(filters.TEXT, input_user)],
                STATE_LOGIN_PASS: [MessageHandler(filters.TEXT, input_pass)],
                STATE_MSG_CONTENT: [MessageHandler(filters.TEXT, input_msg)],
                STATE_ENTER_OTP: [MessageHandler(filters.TEXT, input_otp)],
                STATE_AUTO_MSG: [MessageHandler(filters.TEXT, input_auto_msg)],
            }, fallbacks=[CommandHandler('cancel', cancel)])
        app.add_handler(conv); app.run_polling()
    except Exception as e:
        print(f"❌ CRITICAL ERROR: {e}")
        traceback.print_exc()
