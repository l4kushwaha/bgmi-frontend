const user = JSON.parse(localStorage.getItem("user"));
const token = localStorage.getItem("token");

if (!user || !token) {
  alert("Please login first!");
  window.location.href = "login.html";
}

document.getElementById("sendBtn").addEventListener("click", () => {
  const msg = document.getElementById("msgInput").value.trim();
  if (!msg) return;
  const div = document.createElement("div");
  div.textContent = `${user.username}: ${msg}`;
  document.getElementById("messages").appendChild(div);
  document.getElementById("msgInput").value = "";
});
