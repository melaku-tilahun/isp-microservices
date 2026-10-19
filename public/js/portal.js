function copyToClipboard(text, btnElement) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            showCopyFeedback(btnElement);
        }).catch(() => {
            fallbackCopy(text, btnElement);
        });
    } else {
        fallbackCopy(text, btnElement);
    }
}

function fallbackCopy(text, btnElement) {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    try {
        document.execCommand('copy');
        showCopyFeedback(btnElement);
    } catch (err) {
        alert('Account number: ' + text);
    }
    document.body.removeChild(tempInput);
}

function showCopyFeedback(btnElement) {
    if (!btnElement) return;
    const originalText = btnElement.innerText;
    btnElement.innerText = 'Copied!';
    btnElement.style.background = '#ecfdf5';
    btnElement.style.color = '#10b981';
    setTimeout(() => {
        btnElement.innerText = originalText;
        btnElement.style.background = '';
        btnElement.style.color = '';
    }, 2000);
}

function toggleInvoiceItems(invId) {
    const el = document.getElementById('items_' + invId);
    const chevron = document.getElementById('chevron_' + invId);
    if (!el) return;
    if (el.style.display === 'none' || el.style.display === '') {
        el.style.display = 'block';
        if (chevron) {
            chevron.classList.remove('fa-chevron-right');
            chevron.classList.add('fa-chevron-down');
        }
    } else {
        el.style.display = 'none';
        if (chevron) {
            chevron.classList.remove('fa-chevron-down');
            chevron.classList.add('fa-chevron-right');
        }
    }
}

function updateFileName(input) {
    const label = document.getElementById('file-upload-label');
    if (!label) return;
    if (input.files && input.files.length > 0) {
        const f = input.files[0];
        const sizeMb = (f.size / (1024 * 1024)).toFixed(2);
        label.innerHTML = '<i class="fas fa-file-check text-success" style="color: #10b981; font-size: 1.25rem;"></i> ' +
            '<span style="font-weight: 600; color: #0f172a;">' + escapeHtml(f.name) + '</span> ' +
            '<span style="color: #64748b; font-size: 0.8rem;">(' + sizeMb + ' MB)</span>';
    } else {
        label.innerHTML = '<i class="fas fa-cloud-upload-alt upload-icon"></i> <span>Click to choose receipt image or PDF slip</span>';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.innerText = text;
    return div.innerHTML;
}

function selectPaymentOption(opt) {
    const tabChapa = document.getElementById('tab-chapa');
    const tabManual = document.getElementById('tab-manual');
    const secChapa = document.getElementById('section-chapa');
    const secManual = document.getElementById('section-manual');
    if (!tabChapa || !tabManual) return;

    if (opt === 'chapa') {
        tabChapa.classList.add('active');
        tabManual.classList.remove('active');
        if (secChapa) secChapa.style.display = 'block';
        if (secManual) secManual.style.display = 'none';
    } else {
        tabManual.classList.add('active');
        tabChapa.classList.remove('active');
        if (secChapa) secChapa.style.display = 'none';
        if (secManual) secManual.style.display = 'block';
    }
}
