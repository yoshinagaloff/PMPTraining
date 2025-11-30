const firebaseConfig = {
  apiKey: "AIzaSyBQ2HWP1l7SIz3FyQaNz37xEgXiDAStnCs",
  authDomain: "pmptraining-ad18c.firebaseapp.com",
  databaseURL: "https://pmptraining-ad18c-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "pmptraining-ad18c",
  storageBucket: "pmptraining-ad18c.appspot.com",
  messagingSenderId: "595622352594",
  appId: "1:595622352594:web:1e835cc6fadf45ceedff0b",
  measurementId: "G-9FXNTLV9VV"
};
if (!window.firebase?.apps?.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

if (!document.getElementById("chat-btn-open")) {
  document.body.insertAdjacentHTML("beforeend", `
    <button id="chat-btn-open" title="Tương tác online">💬</button>
    <div id="chat-popup-box">
      <div id="chat-header">
        <span id="chat-header-title">💬 Online Chat</span>
        <span>
          <button id="chat-privatemsg" style="display:none;">PrivateMsgMentor</button>
          <button id="chat-popup-close" title="Đóng">&#10006;</button>
        </span>
      </div>
      <div id="chat-login-area">
        <label>Nhập tên của bạn:</label>
        <input type="text" id="chat-username" maxlength="20" placeholder="Tên (không trùng)">
        <div id="chat-password-row" style="display:none;margin-top:8px;">
          <input type="password" id="chat-password" maxlength="30" placeholder="Password cho Mentor_">
        </div>
        <button id="chat-login-btn">Vào phòng chat</button>
        <div id="chat-info"></div>
      </div>
      <div id="chat-main-area" style="display:none;">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div id="chat-user-list"></div>
          <button id="chat-logout-btn" style="display:inline-block;">Logout</button>
        </div>
        <select id="chat-to-select">
          <option value="__all__">💡 Nhóm chung (tất cả)</option>
        </select>
        <div id="chat-msgs"></div>
        <form id="chat-msg-form" autocomplete="off">
          <input id="chat-msg-input" type="text" maxlength="250" placeholder="Nhập tin nhắn...">
          <button id="chat-emoji-toggle" type="button" tabindex="-1">😊</button>
          <div id="chat-emoji-list">
            <button type="button">😀</button><button type="button">😁</button><button type="button">😂</button><button type="button">🤣</button>
            <button type="button">😊</button><button type="button">😍</button><button type="button">😎</button><button type="button">😢</button>
            <button type="button">😭</button><button type="button">👍</button><button type="button">🙏</button><button type="button">👏</button>
            <button type="button">💪</button><button type="button">❤️</button>
          </div>
          <button id="chat-msg-send" type="submit">Gửi</button>
        </form>
      </div>
    </div>
  `);
}
const chatPopupBox = document.getElementById('chat-popup-box');
const chatBtnOpen = document.getElementById('chat-btn-open');
const chatPopupClose = document.getElementById('chat-popup-close');
const chatLoginArea = document.getElementById('chat-login-area');
const chatMainArea = document.getElementById('chat-main-area');
const chatUsernameInput = document.getElementById('chat-username');
const chatLoginBtn = document.getElementById('chat-login-btn');
const chatLogoutBtn = document.getElementById('chat-logout-btn');
const chatToSelect = document.getElementById('chat-to-select');
const chatMsgs = document.getElementById('chat-msgs');
const chatMsgForm = document.getElementById('chat-msg-form');
const chatMsgInput = document.getElementById('chat-msg-input');
const chatUserList = document.getElementById('chat-user-list');
const chatInfo = document.getElementById('chat-info');
const chatEmojiToggle = document.getElementById('chat-emoji-toggle');
const chatEmojiList = document.getElementById('chat-emoji-list');
const chatPasswordRow = document.getElementById('chat-password-row');
const chatPasswordInput = document.getElementById('chat-password');
const chatPrivMsgBtn = document.getElementById('chat-privatemsg');
let myUsername = null, userRef = null;
let allUsers = {};
let allMsgs = [];
let chatListener = null, userListener = null;
let mentorFilterActive = false;
let mentorFilterTime = null;

function normName(name) {return (name||"").toLowerCase();}

chatBtnOpen.onclick = function(){ chatPopupBox.style.display = (chatPopupBox.style.display==='flex'?'none':'flex'); }
chatPopupClose.onclick = function(){ chatPopupBox.style.display="none"; }
chatLogoutBtn.onclick = function() {
  if (myUsername && userRef) { userRef.remove(); }
  myUsername = null;
  chatLoginArea.style.display="";
  chatMainArea.style.display="none";
  chatInfo.textContent='';
  chatUsernameInput.value='';
  chatMsgs.innerHTML = '';
  chatToSelect.value="__all__";
  mentorFilterActive = false; mentorFilterTime = null;
  showMentorBtn();
};
chatUsernameInput.oninput = function() {
  if(/^mentor_/i.test(chatUsernameInput.value.trim())) {
    chatPasswordRow.style.display = "";
  } else {
    chatPasswordRow.style.display = "none";
  }
};
chatEmojiToggle.onclick = function(e){
  e.preventDefault();
  chatEmojiList.style.display = (chatEmojiList.style.display==="block") ? "none" : "block";
};
document.addEventListener('click', function(e){
  if (!chatEmojiList.contains(e.target) && e.target!==chatEmojiToggle) {
    chatEmojiList.style.display = "none";
  }
});
chatEmojiList.querySelectorAll('button').forEach(btn=>{
  btn.onclick = function(e){
    e.preventDefault();
    chatMsgInput.value += this.textContent;
    chatMsgInput.focus();
    chatEmojiList.style.display = "none";
  }
});
chatLoginBtn.onclick = function() {
  let name = chatUsernameInput.value.trim();
  if (!name) { chatInfo.textContent="Nhập tên!"; return; }
  if (/[^a-zA-Z0-9_.-]/.test(name)) { chatInfo.textContent="Chỉ dùng chữ, số, gạch dưới, dấu chấm, gạch ngang!"; return; }
  let nameNorm = normName(name);
  db.ref('pmpchat/users').once('value', snap=>{
    let users = snap.val()||{};
    for(const uname in users){
      if(normName(uname)===nameNorm){
        chatInfo.textContent="Tên này đã có người dùng!"; chatLoginBtn.disabled=false; return;
      }
    }
    if(/^mentor_/i.test(name)){
      let pwd = chatPasswordInput.value;
      if (pwd !== "MentorPMP2025@") {
        chatInfo.textContent="Sai password Mentor!";
        return;
      }
    }
    chatLoginBtn.disabled = true;
    myUsername = name;
    userRef = db.ref('pmpchat/users/'+name);
    userRef.set({online:true, t:Date.now()});
    userRef.onDisconnect().remove();
    chatLoginArea.style.display="none";
    chatMainArea.style.display="";
    chatInfo.textContent="";
    listenUsers();
    listenMsgs();
    updateUserListUI();
    mentorFilterActive = false;
    mentorFilterTime = null;
    showMentorBtn();
  });
};

// Nút toggle chỉ hiện khi đã login Mentor_
function showMentorBtn() {
  if(/^mentor_/i.test(myUsername)) {
    chatPrivMsgBtn.style.display = 'inline-block';
    updateMentorBtnState();
  } else {
    chatPrivMsgBtn.style.display = 'none';
    chatPrivMsgBtn.classList.remove('active');
    chatPrivMsgBtn.textContent = 'PrivateMsgMentor';
    chatPrivMsgBtn.style.background = '';
    chatPrivMsgBtn.style.color = '';
  }
}
function updateMentorBtnState() {
  if (mentorFilterActive) {
    chatPrivMsgBtn.classList.add('active');
    chatPrivMsgBtn.style.background = '#ff9800';
    chatPrivMsgBtn.style.color = '#fff';
    chatPrivMsgBtn.textContent = 'PublicMsg';
  } else {
    chatPrivMsgBtn.classList.remove('active');
    chatPrivMsgBtn.style.background = '#ffd54f';
    chatPrivMsgBtn.style.color = '#333';
    chatPrivMsgBtn.textContent = 'PrivateMsgMentor';
  }
}

// Toggle logic
chatPrivMsgBtn.onclick = function() {
  mentorFilterActive = !mentorFilterActive;
  updateMentorBtnState();
  if (mentorFilterActive) {
    mentorFilterTime = Date.now();
    db.ref('pmpchat/msgs').push({
      from: myUsername,
      to: "__all__",
      content: "[Mentor đã bật chế độ PrivateMsgMentor. Các user khác sẽ chỉ thấy tin nhắn Mentor_ từ thời điểm này.]",
      t: mentorFilterTime,
      mentorFilterActive: true,
      mentorFilterTime: mentorFilterTime
    });
  } else {
    mentorFilterTime = null;
    db.ref('pmpchat/msgs').push({
      from: myUsername,
      to: "__all__",
      content: "[Mentor đã TẮT chế độ PrivateMsgMentor. Tất cả user sẽ thấy lại mọi tin nhắn.]",
      t: Date.now()
    });
  }
};

function listenUsers() {
  if (userListener) db.ref('pmpchat/users').off('value', userListener);
  userListener = db.ref('pmpchat/users').on('value', snap=>{
    allUsers = snap.val()||{};
    updateUserListUI();
    updateCombo();
  });
}
function updateUserListUI() {
  let arr = Object.keys(allUsers||{}).sort();
  chatUserList.innerHTML = arr.length
    ? '<b>Online:</b> ' + arr.map(n=> normName(n)===normName(myUsername)?`<span style="color:#1976d2">${n}</span>`:n).join(', ')
    : '<span style="color:#d32f2f">Không có ai online</span>';
}
function updateCombo() {
  let val = chatToSelect.value;
  chatToSelect.innerHTML = '<option value="__all__">💡 Nhóm chung (tất cả)</option>';
  let arr = Object.keys(allUsers||{}).sort().filter(n=>normName(n)!==normName(myUsername));
  arr.forEach(n=>{
    chatToSelect.innerHTML += `<option value="${n}">👤 ${n}</option>`;
  });
  if (arr.length>=2) {
    chatToSelect.innerHTML += `<option value="__group__">👥 Nhóm nhỏ tuỳ chọn</option>`;
  }
  chatToSelect.value = val;
}
function listenMsgs() {
  if (chatListener) db.ref('pmpchat/msgs').off('value', chatListener);
  chatListener = db.ref('pmpchat/msgs').on('value', snap=>{
    allMsgs = [];
    snap.forEach(child=>{ allMsgs.push(child.val()); });
    renderChatMsgs();
  });
}
chatMsgForm.onsubmit = function(e){
  e.preventDefault();
  let to = chatToSelect.value;
  let content = chatMsgInput.value.trim();
  if (!content) return;
  let msg = {
    from: myUsername,
    to: to,
    content: content,
    t: Date.now()
  };
  db.ref('pmpchat/msgs').push(msg);
  chatMsgInput.value="";
};

function renderChatMsgs() {
  let sel = chatToSelect.value;
  let latestMentorFilterTime = null;
  for (let i=allMsgs.length-1; i>=0; --i) {
    let m = allMsgs[i];
    if (m.mentorFilterActive && m.mentorFilterTime && m.from && /^mentor_/i.test(m.from)) {
      latestMentorFilterTime = m.mentorFilterTime;
      break;
    }
  }
  let arr;
  if (sel==="__all__") {
    if (myUsername && !/^mentor_/i.test(myUsername) && mentorFilterActive && latestMentorFilterTime) {
      arr = allMsgs.filter(m=>
        (m.t >= latestMentorFilterTime &&
          (m.from && /^mentor_/i.test(m.from) || m.content?.startsWith('['))
        )
      );
    } else {
      arr = allMsgs.filter(m=>m.to==="__all__");
    }
  } else if (sel==="__group__") {
    arr = [];
  } else {
    arr = allMsgs.filter(m=>
      (normName(m.from)===normName(myUsername) && m.to===sel) || (normName(m.from)===normName(sel) && m.to===myUsername)
    );
  }
  arr = arr.slice(-100);
  chatMsgs.innerHTML = '';
  arr.forEach(m=>{
    let isMe = normName(m.from)===normName(myUsername);
    let div = document.createElement('div');
    div.className = isMe ? 'chat-msg-you' : 'chat-msg-other';
    div.innerHTML =
      (!isMe && m.from ? `<div class="chat-msg-username">${m.from}</div>`:'') +
      `<span class="chat-msg-bubble">${m.content}</span>`;
    chatMsgs.appendChild(div);
  });
  chatMsgs.scrollTop = chatMsgs.scrollHeight;
}
chatToSelect.onchange = renderChatMsgs;
window.addEventListener('beforeunload', function() {
  if (myUsername && userRef) userRef.remove();
});