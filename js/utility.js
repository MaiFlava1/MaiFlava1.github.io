closeCustomAlert();

function showCustomAlert(title, message) {
    document.getElementById('alertTitle').innerText = title;
    document.getElementById('alertMessage').innerText = message;
    document.getElementById('customAlert').style.display = 'flex';
}

function closeCustomAlert() {
    document.getElementById('customAlert').style.display = 'none';
}

function copyEmail() {
    navigator.clipboard.writeText('MaiFlava1@gmail.com')
        .then(() => {
            showCustomAlert('Email Copied!', 'MaiFlava1@gmail.com\nEmail has been copied to your clipboard.');
        })
        .catch(err => {
            console.error('MaiFlava1@gmail.com\nClipboard copy failed:', err);
            showCustomAlert('Error', 'Failed to copy email: ' + err.message);
        });
}

function meowAlert(){
  showCustomAlert('Meow', 'Meow, MeowMeowMeow, MeowMeow');
}