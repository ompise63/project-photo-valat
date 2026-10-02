document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide icons
    lucide.createIcons();

    // UI Elements
    const btnEnterApp = document.getElementById('btn-enter-app');
    const landingPage = document.getElementById('landing-page');
    const mainApp = document.getElementById('main-app');

    // Landing Page logic
    if (btnEnterApp) {
        btnEnterApp.addEventListener('click', () => {
            landingPage.style.opacity = '0';
            setTimeout(() => {
                landingPage.classList.add('hidden');
                mainApp.classList.remove('hidden');
                // Optional: trigger reflow for smooth fade-in if desired
                mainApp.style.opacity = '0';
                mainApp.style.transition = 'opacity 0.5s ease';
                setTimeout(() => mainApp.style.opacity = '1', 50);
            }, 500);
        });
    }

    const tabs = document.querySelectorAll('.tab-btn');
    const views = document.querySelectorAll('.view-panel');
    const toastEl = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-message');

    // Encoder Elements
    const encImageUpload = document.getElementById('enc-image-upload');
    const encImageInput = document.getElementById('enc-image-input');
    const encCanvas = document.getElementById('enc-canvas');
    const encCtx = encCanvas.getContext('2d');
    const dataTypeRadios = document.getElementsByName('dataType');
    const encTextInputArea = document.getElementById('enc-text-input-area');
    const encFileInputArea = document.getElementById('enc-file-input-area');
    const encFileInput = document.getElementById('enc-file-input');
    const encFileUpload = document.getElementById('enc-file-upload');
    const encFileList = document.getElementById('enc-file-list');
    const encPassword = document.getElementById('enc-password');
    const encMethod = document.getElementById('enc-method');
    const btnEncode = document.getElementById('btn-encode');
    const encResult = document.getElementById('enc-result');
    const encOutputImg = document.getElementById('enc-output-img');
    const encDownloadBtn = document.getElementById('enc-download-btn');
    
    // Decoder Elements
    const decImageUpload = document.getElementById('dec-image-upload');
    const decImageInput = document.getElementById('dec-image-input');
    const decCanvas = document.getElementById('dec-canvas');
    const decCtx = decCanvas.getContext('2d');
    const decPassword = document.getElementById('dec-password');
    const btnDecode = document.getElementById('btn-decode');
    const decResult = document.getElementById('dec-result');
    const decOutputTextArea = document.getElementById('dec-output-text-area');
    const decOutputText = document.getElementById('dec-output-text');
    const btnCopyText = document.getElementById('btn-copy-text');
    const decOutputFileArea = document.getElementById('dec-output-file-area');
    const btnDownloadFiles = document.getElementById('btn-download-files');

    // State
    let currentImage = null; // for encoder
    let encodedImage = null; // for decoder
    let selectedFiles = []; // for encoder
    let decodedZipBlob = null; // for decoder

    // Helper: Toast
    function showToast(message, type = 'success') {
        toastMsg.textContent = message;
        toastEl.className = `toast show ${type}`;
        setTimeout(() => { toastEl.className = 'toast hidden'; }, 3000);
    }

    // Tabs logic
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            views.forEach(v => v.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });

    // Helper: Load image to canvas
    function loadImageToCanvas(file, canvas, ctx, callback) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                canvas.hidden = false;
                if(callback) callback(img);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Image Upload Handlers
    function setupUpload(dropzone, input, canvas, ctx, isEncoder) {
        dropzone.addEventListener('click', () => input.click());
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            if(e.dataTransfer.files.length) {
                input.files = e.dataTransfer.files;
                handleImage(input.files[0]);
            }
        });
        input.addEventListener('change', (e) => {
            if(e.target.files.length) handleImage(e.target.files[0]);
        });

        function handleImage(file) {
            if(!file.type.startsWith('image/')) {
                return showToast('Please upload an image file.', 'error');
            }
            dropzone.style.display = 'none';
            loadImageToCanvas(file, canvas, ctx, (img) => {
                if(isEncoder) currentImage = file;
                else encodedImage = file;
            });
        }
    }

    setupUpload(encImageUpload, encImageInput, encCanvas, encCtx, true);
    setupUpload(decImageUpload, decImageInput, decCanvas, decCtx, false);

    // Encoder: Data Type Toggle
    dataTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if(e.target.value === 'text') {
                encTextInputArea.hidden = false;
                encFileInputArea.hidden = true;
            } else {
                encTextInputArea.hidden = true;
                encFileInputArea.hidden = false;
            }
        });
    });

    // Encoder: File Selection
    encFileUpload.addEventListener('click', () => encFileInput.click());
    encFileInput.addEventListener('change', (e) => {
        selectedFiles = Array.from(e.target.files);
        encFileList.innerHTML = '';
        selectedFiles.forEach(file => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${file.name}</span> <span>${(file.size/1024).toFixed(1)} KB</span>`;
            encFileList.appendChild(li);
        });
    });

    // ==========================================
    // ENCODING LOGIC
    // ==========================================
    btnEncode.addEventListener('click', async () => {
        if(!currentImage) return showToast('Please upload a cover image first', 'error');
        
        const type = document.querySelector('input[name="dataType"]:checked').value;
        const password = encPassword.value;
        const method = encMethod.value;
        
        if(!password) return showToast('Encryption password is required', 'error');

        btnEncode.disabled = true;
        btnEncode.innerHTML = '<i data-lucide="loader" class="spin"></i> Processing...';
        lucide.createIcons();

        try {
            let rawData = "";
            let metadata = { type: type };

            if(type === 'text') {
                const text = document.getElementById('enc-text-input').value;
                if(!text) throw new Error("Please enter text to encode");
                rawData = text;
            } else {
                if(!selectedFiles.length) throw new Error("Please select files to encode");
                // Compress files
                const zip = new JSZip();
                selectedFiles.forEach(f => zip.file(f.name, f));
                const zipData = await zip.generateAsync({type:"base64"});
                rawData = zipData;
            }

            // 1. Package Payload
            const payload = JSON.stringify({ meta: metadata, data: rawData });
            
            // 2. Encrypt Payload
            const encryptedStr = CryptoJS.AES.encrypt(payload, password).toString();

            // 3. Encode into Image
            if(method === 'steganography') {
                await encodeSteganography(encryptedStr);
            } else if (method === 'qr') {
                await generateQROutput(encryptedStr);
            }
            
            showToast('Encoding Successful!');
        } catch (err) {
            showToast(err.message || 'Encoding failed', 'error');
        } finally {
            btnEncode.disabled = false;
            btnEncode.innerHTML = '<i data-lucide="lock"></i> Encode & Generate';
            lucide.createIcons();
        }
    });

    async function encodeSteganography(dataStr) {
        // Simple LSB Steganography
        // Add a magic header and length
        const prefix = "VAULT:";
        const payload = prefix + dataStr;
        
        // Convert payload to binary string
        let binStr = "";
        for(let i=0; i<payload.length; i++) {
            let bin = payload.charCodeAt(i).toString(2).padStart(8, '0');
            binStr += bin;
        }

        let imgData = encCtx.getImageData(0, 0, encCanvas.width, encCanvas.height);
        
        // Calculate required bits
        const requiredBits = binStr.length + 8;
        const availableBits = imgData.data.length * 0.75;
        
        if (requiredBits > availableBits) {
            // Resize canvas to fit the data
            const scale = Math.sqrt(requiredBits / availableBits) * 1.05; // 5% margin
            const newWidth = Math.ceil(encCanvas.width * scale);
            const newHeight = Math.ceil(encCanvas.height * scale);
            
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = encCanvas.width;
            tempCanvas.height = encCanvas.height;
            tempCanvas.getContext('2d').drawImage(encCanvas, 0, 0);
            
            encCanvas.width = newWidth;
            encCanvas.height = newHeight;
            // Draw scaled image
            encCtx.drawImage(tempCanvas, 0, 0, newWidth, newHeight);
            
            // Re-fetch image data
            imgData = encCtx.getImageData(0, 0, encCanvas.width, encCanvas.height);
        }

        const data = imgData.data;
        let bitIndex = 0;
        
        for(let i = 0; i < data.length; i++) {
            if ((i + 1) % 4 === 0) continue; 
            
            if (bitIndex < binStr.length) {
                let bit = parseInt(binStr[bitIndex]);
                data[i] = (data[i] & ~1) | bit;
                bitIndex++;
            } else if (bitIndex < binStr.length + 8) {
                data[i] = (data[i] & ~1); // null terminator
                bitIndex++;
            } else {
                break;
            }
        }

        encCtx.putImageData(imgData, 0, 0);
        showOutput(encCanvas.toDataURL('image/png'));
    }

    async function generateQROutput(dataStr) {
        if (dataStr.length > 2000) {
            throw new Error("Payload too large for QR Code. Please use Steganography for files or large text.");
        }
        // Generate QR Code data URL
        // Instead of overlaying on the picture, output the QR code directly
        const qrDataUrl = await QRCode.toDataURL(dataStr, { margin: 2, scale: 8 });
        showOutput(qrDataUrl);
    }

    function showOutput(dataUrl) {
        encOutputImg.src = dataUrl;
        encDownloadBtn.href = dataUrl;
        encResult.hidden = false;
    }

    // ==========================================
    // DECODING LOGIC
    // ==========================================
    btnDecode.addEventListener('click', async () => {
        if(decCanvas.hidden) return showToast('Please upload an encoded image first', 'error');
        
        const password = decPassword.value;
        if(!password) return showToast('Decryption password is required', 'error');

        btnDecode.disabled = true;
        btnDecode.innerHTML = '<i data-lucide="loader" class="spin"></i> Decoding...';
        lucide.createIcons();

        try {
            // First try QR
            let encryptedStr = tryDecodeQR();
            
            if(!encryptedStr) {
                // Fallback to Steganography
                encryptedStr = tryDecodeSteganography();
            }

            if(!encryptedStr) throw new Error("No hidden data found in image");

            // Decrypt
            const bytes  = CryptoJS.AES.decrypt(encryptedStr, password);
            const decryptedPayload = bytes.toString(CryptoJS.enc.Utf8);

            if(!decryptedPayload) throw new Error("Invalid password or corrupt data");

            const payloadObj = JSON.parse(decryptedPayload);

            decResult.hidden = false;
            if(payloadObj.meta.type === 'text') {
                decOutputTextArea.hidden = false;
                decOutputFileArea.hidden = true;
                decOutputText.value = payloadObj.data;
            } else {
                decOutputTextArea.hidden = true;
                decOutputFileArea.hidden = false;
                
                // Convert base64 zip back to blob
                const byteCharacters = atob(payloadObj.data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                decodedZipBlob = new Blob([byteArray], {type: 'application/zip'});
            }
            
            showToast('Decryption Successful!');
        } catch (err) {
            showToast(err.message || 'Decryption failed', 'error');
        } finally {
            btnDecode.disabled = false;
            btnDecode.innerHTML = '<i data-lucide="unlock"></i> Extract & Decode';
            lucide.createIcons();
        }
    });

    function tryDecodeQR() {
        const imgData = decCtx.getImageData(0, 0, decCanvas.width, decCanvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height);
        return code ? code.data : null;
    }

    function tryDecodeSteganography() {
        const imgData = decCtx.getImageData(0, 0, decCanvas.width, decCanvas.height);
        const data = imgData.data;
        
        let binStr = "";
        // We read until we find VAULT: prefix, then read everything until invalid chars or end
        for(let i=0; i<data.length; i++) {
            if ((i + 1) % 4 === 0) continue; 
            binStr += (data[i] & 1).toString();
        }

        // Convert binary string to chars
        let chars = "";
        for(let i=0; i<binStr.length; i+=8) {
            const byte = binStr.substr(i, 8);
            if(byte === "00000000") break; // null terminator
            chars += String.fromCharCode(parseInt(byte, 2));
        }

        if(chars.startsWith("VAULT:")) {
            return chars.substring(6);
        }
        return null;
    }

    btnCopyText.addEventListener('click', () => {
        decOutputText.select();
        document.execCommand('copy');
        showToast('Text copied to clipboard');
    });

    btnDownloadFiles.addEventListener('click', () => {
        if(decodedZipBlob) {
            const url = window.URL.createObjectURL(decodedZipBlob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'vault-extracted.zip';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        }
    });
});
