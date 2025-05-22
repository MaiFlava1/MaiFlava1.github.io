function copyEmail() {
  navigator.clipboard.writeText('MaiFlava1@gmail.com')
    .then(() => alert('MaiFlava1@gmail.com\nEmail copied to clipboard'))
    .catch(err => console.error('MaiFlava1@gmail.com\nClipboard copy failed:', err));
}