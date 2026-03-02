// ==========================================
// NEXRESUME BUILDER - CORE SCRIPT
// ==========================================

// Initialize Feather Icons
feather.replace();

// ----- UI NOTIFICATION ENGINE -----
function showInstructionToast(message, icon = 'info', duration = 3000) {
    const toast = document.querySelector('.instruction-toast');
    if (!toast) return;

    if (!toast.dataset.originalHtml) {
        toast.dataset.originalHtml = toast.innerHTML;
    }

    const formattedMessage = message.replace(/\n/g, '<br>');

    toast.innerHTML = `<i data-feather="${icon}"></i> <span>${formattedMessage}</span>`;
    feather.replace();

    toast.style.animation = 'none';
    toast.style.opacity = '1';

    if (toast.dataset.timeoutId) {
        clearTimeout(parseInt(toast.dataset.timeoutId));
    }

    const timeoutId = setTimeout(() => {
        toast.innerHTML = toast.dataset.originalHtml;
        feather.replace();
        toast.style.animation = 'float 3s ease-in-out infinite, fadeInOut 5s forwards';
    }, duration);

    toast.dataset.timeoutId = timeoutId;
}

// ----- INITIAL UNIVERSAL STATE -----
const defaultState = {
    document: {
        design: {
            primaryColor: '#3b82f6',
            fontFamily: "'Inter', sans-serif",
            layout: "layout-single-column"
        },
        personalInfo: {
            name: "Alex Sterling",
            title: "Senior Full-Stack Product Engineer",
            email: "alex.sterling@example.com",
            phone: "+1 (555) 123-4567",
            location: "San Francisco, CA",
            profilePic: "",
            picBorder: true
        },
        sections: [
            {
                id: "sec_summary",
                title: "Professional Summary",
                type: "text",
                content: "Results-driven Senior Full-Stack Engineer with 7+ years of experience designing, architecting, and scaling high-traffic web applications. Proven track record of leading cross-functional teams to deliver secure, responsive, and highly-performant digital products. Passionate about UI/UX, system architecture, and optimizing the developer experience."
            },
            {
                id: "sec_skills",
                title: "Core Competencies & Technologies",
                type: "tags",
                items: ["React.js & Next.js", "Node.js & Express", "TypeScript / JavaScript", "PostgreSQL & MongoDB", "AWS & Docker", "System Architecture", "Agile & Scrum", "UI/UX Design"]
            },
            {
                id: "sec_experience",
                title: "Professional Experience",
                type: "list",
                items: [
                    {
                        id: "item_exp_1",
                        title: "Lead Web Developer",
                        period: "Jan 2021 - Present",
                        subtitle: "TechNova Solutions | San Francisco, CA",
                        description: "<ul><li>Led a team of 6 engineers to rebuild the core flagship product from AngularJS to React/Next.js, resulting in a <b>40% increase in load speed</b> and a 15% increase in user retention.</li><li>Architected robust microservices backend using Node.js and Docker, improving system uptime to 99.99%.</li><li>Mentored junior developers, instituted code-review best practices, and reduced deployment bug rates by 30%.</li></ul>"
                    },
                    {
                        id: "item_exp_2",
                        title: "Software Engineer",
                        period: "Jun 2018 - Dec 2020",
                        subtitle: "Innovate AI | Seattle, WA",
                        description: "<ul><li>Developed and maintained interactive dashboards visualizing complex AI models using React and D3.js.</li><li>Optimized database queries in PostgreSQL, reducing average report generation time from 15 seconds to under 2 seconds.</li><li>Collaborated directly with the Product Management team to define quarterly roadmaps and deliver 4 major feature releases on time.</li></ul>"
                    }
                ]
            },
            {
                id: "sec_education",
                title: "Education",
                type: "list",
                items: [
                    {
                        id: "item_edu_1",
                        title: "Master of Science in Computer Science",
                        period: "2016 - 2018",
                        subtitle: "University of Technology",
                        description: "Graduated with Honors. Focus on Machine Learning and Distributed Systems. Teaching Assistant for Data Structures."
                    },
                    {
                        id: "item_edu_2",
                        title: "Bachelor of Science in Software Engineering",
                        period: "2012 - 2016",
                        subtitle: "State University",
                        description: "Dean's List. Capstone Project: Developed an open-source lightweight task management system used by 500+ students."
                    }
                ]
            }
        ]
    }
};

// Attempt to load from URL first, then localStorage, then default
let urlData = null;
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('id')) {
    const resumeId = urlParams.get('id');
    const storedData = localStorage.getItem(`nexResume_share_${resumeId}`);
    if (storedData) {
        try {
            urlData = JSON.parse(storedData);
        } catch (e) {
            console.error("Failed to parse shared resume data from localStorage", e);
        }
    } else {
        showInstructionToast("Shared resume link expired or not found. Loading previous state.", "alert-triangle", 4000);
    }
} else if (urlParams.has('data')) {
    // Fallback for old links
    try {
        const decoded = atob(urlParams.get('data'));
        urlData = JSON.parse(decoded);
    } catch (e) {
        console.error("Failed to parse old shared resume data", e);
    }
}

let resumeState = urlData || JSON.parse(localStorage.getItem('nexResumeState')) || JSON.parse(JSON.stringify(defaultState));
let stateHistory = [JSON.parse(JSON.stringify(resumeState))];
let historyIndex = 0;
let dragStartIndex = null;
let currentZoom = window.innerWidth <= 768 ? Math.min((window.innerWidth - 40) / 794, 1) : 1;

// ----- STATE MANAGEMENT -----
function saveState(addToHistory = true) {
    localStorage.setItem('nexResumeState', JSON.stringify(resumeState));
    if (addToHistory) {
        // Drop any future history if we're branching from the past
        stateHistory = stateHistory.slice(0, historyIndex + 1);

        // Deep clone the state without duplicating the massive base64 image 20 times
        const clonedState = JSON.parse(JSON.stringify(resumeState));
        if (clonedState?.document?.personalInfo?.profilePic) {
            clonedState.document.personalInfo.profilePic = "has_pic";
        }

        stateHistory.push(clonedState);

        // Limit history to 20 to prevent memory leak
        if (stateHistory.length > 20) {
            stateHistory.shift();
        } else {
            historyIndex++;
        }
    }
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        const nextState = JSON.parse(JSON.stringify(stateHistory[historyIndex]));
        if (nextState?.document?.personalInfo?.profilePic === "has_pic") {
            nextState.document.personalInfo.profilePic = resumeState.document.personalInfo.profilePic;
        }
        resumeState = nextState;
        saveState(false);
        renderResume();
    }
}

function redo() {
    if (historyIndex < stateHistory.length - 1) {
        historyIndex++;
        const nextState = JSON.parse(JSON.stringify(stateHistory[historyIndex]));
        if (nextState?.document?.personalInfo?.profilePic === "has_pic") {
            nextState.document.personalInfo.profilePic = resumeState.document.personalInfo.profilePic;
        }
        resumeState = nextState;
        saveState(false);
        renderResume();
    }
}

function updateRootVariables() {
    const root = document.documentElement;
    root.style.setProperty('--resume-primary', resumeState.document.design.primaryColor);
    root.style.setProperty('--resume-font', resumeState.document.design.fontFamily);
    saveState();
}

// ----- CORE RENDER ENGINE -----

// Sanitization utility using native text parser to prevent XSS attacks
function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function handleFormatting(htmlString) {
    if (!htmlString) return htmlString;
    // Re-enable tags created by document.execCommand during editing but still sanitize unknown elements
    let sanitized = escapeHTML(htmlString);
    // Whitelist specific formatting tags
    return sanitized
        .replace(/&lt;b&gt;/g, '<b>')
        .replace(/&lt;\/b&gt;/g, '</b>')
        .replace(/&lt;i&gt;/g, '<i>')
        .replace(/&lt;\/i&gt;/g, '</i>')
        .replace(/&lt;strong&gt;/g, '<strong>')
        .replace(/&lt;\/strong&gt;/g, '</strong>')
        .replace(/&lt;em&gt;/g, '<em>')
        .replace(/&lt;\/em&gt;/g, '</em>')
        .replace(/&lt;u&gt;/g, '<u>')
        .replace(/&lt;\/u&gt;/g, '</u>')
        .replace(/&lt;ul&gt;/g, '<ul>')
        .replace(/&lt;\/ul&gt;/g, '</ul>')
        .replace(/&lt;li&gt;/g, '<li>')
        .replace(/&lt;\/li&gt;/g, '</li>')
        .replace(/&lt;br&gt;/g, '<br>')
        .replace(/&lt;br\/?&gt;/g, '<br/>')
        .replace(/&lt;font color=&quot;(.*?)&quot;&gt;/g, '<font color="$1">')
        .replace(/&lt;\/font&gt;/g, '</font>');
}

function renderResume() {
    updateRootVariables();
    const previewContainer = document.getElementById('resumePreview');
    const data = resumeState.document;
    const hasPic = !!data.personalInfo.profilePic;
    const borderClass = data.personalInfo.picBorder ? 'has-border' : '';

    previewContainer.className = `a4-page ${data.design.layout || 'layout-single-column'}`;

    let html = `
        <header class="res-header">
            <div class="res-profile-pic ${hasPic ? 'has-image' : ''} ${borderClass}" 
                 style="background-image: url('${data.personalInfo.profilePic || ''}');">
            </div>
            <div class="res-header-content">
                <div class="res-name" contenteditable="true" data-type="personal" data-field="name">${handleFormatting(data.personalInfo.name)}</div>
                <div class="res-title" contenteditable="true" data-type="personal" data-field="title">${handleFormatting(data.personalInfo.title)}</div>
                <div class="res-contact">
                    <span contenteditable="true" data-type="personal" data-field="email">${handleFormatting(data.personalInfo.email)}</span> • 
                    <span contenteditable="true" data-type="personal" data-field="phone">${handleFormatting(data.personalInfo.phone)}</span> • 
                    <span contenteditable="true" data-type="personal" data-field="location">${handleFormatting(data.personalInfo.location)}</span>
                </div>
            </div>
        </header>
    `;

    data.sections.forEach(sec => {
        html += `<section class="res-section" id="${sec.id}">
            <h2 class="res-section-title" contenteditable="true" data-type="sectionTitle" data-id="${sec.id}">${handleFormatting(sec.title)}</h2>
        `;

        if (sec.type === 'list') {
            sec.items.forEach(item => {
                html += `
                <div class="res-item">
                    <div class="res-item-header">
                        <div class="res-item-title" contenteditable="true" data-type="listItem" data-sec="${sec.id}" data-item="${item.id}" data-field="title">${handleFormatting(item.title)}</div>
                        <div class="res-item-date" contenteditable="true" data-type="listItem" data-sec="${sec.id}" data-item="${item.id}" data-field="period">${handleFormatting(item.period)}</div>
                    </div>
                    <div class="res-item-subtitle" contenteditable="true" data-type="listItem" data-sec="${sec.id}" data-item="${item.id}" data-field="subtitle">${handleFormatting(item.subtitle)}</div>
                    <div class="res-item-desc" contenteditable="true" data-type="listItem" data-sec="${sec.id}" data-item="${item.id}" data-field="description">${handleFormatting(item.description)}</div>
                </div>`;
            });
        }
        else if (sec.type === 'tags') {
            html += `<div class="res-tags-container">`;
            sec.items.forEach((tag, idx) => {
                html += `<div class="res-tag" contenteditable="true" data-type="tag" data-sec="${sec.id}" data-idx="${idx}">${handleFormatting(tag)}</div>`;
            });
            html += `</div>`;
        }
        else if (sec.type === 'text') {
            html += `<div class="res-item-desc" contenteditable="true" data-type="text" data-sec="${sec.id}">${handleFormatting(sec.content)}</div>`;
        }

        html += `</section>`;
    });

    previewContainer.innerHTML = html;
    attachEditableListeners();
    renderSidebarSections();
    initProfileDragAndDrop(); // Initialize D&D after render
}

// ----- IMAGE COMPRESSION HELPER -----
function compressImage(base64Str, maxWidth, maxHeight, quality, callback) {
    const img = new Image();
    img.src = base64Str;
    img.onload = function () {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
        }
        if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        callback(compressedBase64);
    };
}

function initProfileDragAndDrop() {
    const profilePic = document.querySelector('.res-profile-pic');
    if (!profilePic) return;

    profilePic.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        profilePic.classList.add('drag-active');
    });

    profilePic.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        profilePic.classList.remove('drag-active');
    });

    profilePic.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        profilePic.classList.remove('drag-active');

        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function (event) {
                compressImage(event.target.result, 400, 400, 0.7, function (compressedBase64) {
                    resumeState.document.personalInfo.profilePic = compressedBase64;
                    const removeImgBtn = document.getElementById('removeImageBtn');
                    if (removeImgBtn) removeImgBtn.style.display = 'flex';
                    renderResume();
                });
            };
            reader.readAsDataURL(file);
        }
    });
}

function renderSidebarSections() {
    const sectionListContainer = document.getElementById('sectionList');
    sectionListContainer.innerHTML = '';

    resumeState.document.sections.forEach((sec, index) => {
        const div = document.createElement('div');
        div.className = 'section-item';
        div.draggable = true;
        div.dataset.index = index;
        div.innerHTML = `
            <span class="title" style="display: flex; align-items: center;">
                <i data-feather="grid" class="drag-handle" style="width: 14px; margin-right: 8px; cursor: grab; color: var(--text-muted);"></i>
                ${sec.title}
            </span>
            <div class="actions">
                <i data-feather="trash-2" class="delete-icon" data-id="${sec.id}"></i>
            </div>
        `;

        div.addEventListener('dragstart', (e) => {
            dragStartIndex = index;
            e.dataTransfer.setData('text/plain', index);
            setTimeout(() => div.classList.add('dragging'), 0);
        });

        div.addEventListener('dragend', () => div.classList.remove('dragging'));

        div.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingEl = document.querySelector('.dragging');
            if (draggingEl && draggingEl !== div) {
                const rect = div.getBoundingClientRect();
                const offset = e.clientY - rect.top;
                if (offset < rect.height / 2) {
                    div.style.borderTop = '2px solid var(--accent-base)';
                    div.style.borderBottom = '';
                } else {
                    div.style.borderBottom = '2px solid var(--accent-base)';
                    div.style.borderTop = '';
                }
            }
        });

        div.addEventListener('dragleave', () => {
            div.style.borderTop = '';
            div.style.borderBottom = '';
        });

        div.addEventListener('drop', (e) => {
            e.preventDefault();
            div.style.borderTop = '';
            div.style.borderBottom = '';

            const dropIndex = index;
            if (dragStartIndex !== null && dragStartIndex !== dropIndex) {
                const item = resumeState.document.sections.splice(dragStartIndex, 1)[0];
                const rect = div.getBoundingClientRect();
                const offset = e.clientY - rect.top;
                let insertIndex = dropIndex;
                if (offset > rect.height / 2) insertIndex++;
                if (dragStartIndex < dropIndex && offset <= rect.height / 2) insertIndex--;

                resumeState.document.sections.splice(insertIndex, 0, item);
                renderResume();
            }
        });

        sectionListContainer.appendChild(div);
    });

    feather.replace();

    document.querySelectorAll('.delete-icon').forEach(icon => {
        icon.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            resumeState.document.sections = resumeState.document.sections.filter(s => s.id !== id);
            renderResume();
        });
    });
}

function attachEditableListeners() {
    const previewContainer = document.getElementById('resumePreview');
    const editables = previewContainer.querySelectorAll('[contenteditable="true"]');

    editables.forEach(el => {
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && el.dataset.field !== 'description' && el.dataset.type !== 'text') {
                e.preventDefault();
                el.blur();
            }
        });

        el.addEventListener('blur', (e) => {
            const content = e.target.innerHTML;
            const ds = e.target.dataset;

            if (ds.type === 'personal') {
                resumeState.document.personalInfo[ds.field] = content;
            }
            else if (ds.type === 'sectionTitle') {
                const sec = resumeState.document.sections.find(s => s.id === ds.id);
                if (sec) sec.title = content;
                renderSidebarSections();
            }
            else if (ds.type === 'listItem') {
                const sec = resumeState.document.sections.find(s => s.id === ds.sec);
                const item = sec.items.find(i => i.id === ds.item);
                if (item) item[ds.field] = content;
            }
            else if (ds.type === 'tag') {
                const sec = resumeState.document.sections.find(s => s.id === ds.sec);
                sec.items[parseInt(ds.idx)] = content;
            }
            else if (ds.type === 'text') {
                const sec = resumeState.document.sections.find(s => s.id === ds.sec);
                sec.content = content;
            }
            saveState();
        });
    });
}

// ----- SMART PAGE BREAK ALGORITHM -----
function applySmartPageBreaks(cloneElement) {
    const A4_HEIGHT_PX = 1123;
    const blocks = cloneElement.querySelectorAll('.res-header, .res-section-title, .res-item, .res-tags-container, .res-item-desc[data-type="text"]');

    let currentPage = 1;

    blocks.forEach(block => {
        const rect = block.getBoundingClientRect();
        const cloneRect = cloneElement.getBoundingClientRect();

        const topPos = rect.top - cloneRect.top;
        const bottomPos = rect.bottom - cloneRect.top;
        const pageBoundary = currentPage * A4_HEIGHT_PX;

        // Apply margin if a block spans across the page boundary
        if (topPos < pageBoundary && bottomPos > pageBoundary) {
            const pushAmount = (pageBoundary - topPos) + 40;
            const currentMargin = parseFloat(window.getComputedStyle(block).marginTop) || 0;
            block.style.marginTop = `${currentMargin + pushAmount}px`;

            currentPage++;
        } else if (topPos >= pageBoundary) {
            currentPage = Math.floor(topPos / A4_HEIGHT_PX) + 1;
        }
    });

    // Ensure total height is a multiple of A4 layout
    const finalHeight = cloneElement.getBoundingClientRect().height;
    const remainder = finalHeight % A4_HEIGHT_PX;
    if (remainder > 0) {
        const currentPadding = parseFloat(window.getComputedStyle(cloneElement).paddingBottom) || 0;
        cloneElement.style.paddingBottom = `${currentPadding + (A4_HEIGHT_PX - remainder)}px`;
    }
}

// ==========================================
// INITIALIZATION FUNCTIONS
// ==========================================

function initThemeControls() {
    const colors = ['#3b82f6', '#10b981', '#f43f5e', '#8b5cf6', '#f59e0b', '#0f172a'];
    const colorGrid = document.getElementById('colorPickerGrid');

    colors.forEach(color => {
        const dot = document.createElement('div');
        dot.className = 'color-dot';
        dot.style.backgroundColor = color;
        if (color === resumeState.document.design.primaryColor) dot.classList.add('active');

        dot.addEventListener('click', () => {
            document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
            resumeState.document.design.primaryColor = color;
            updateRootVariables();
        });
        colorGrid.appendChild(dot);
    });

    const fontSelector = document.getElementById('fontFamilySelector');
    fontSelector.value = resumeState.document.design.fontFamily;

    fontSelector.addEventListener('change', (e) => {
        resumeState.document.design.fontFamily = e.target.value;
        updateRootVariables();
    });

    const layoutSelector = document.getElementById('layoutSelector');
    if (layoutSelector) {
        layoutSelector.value = resumeState.document.design.layout || 'layout-single-column';
        layoutSelector.addEventListener('change', (e) => {
            resumeState.document.design.layout = e.target.value;
            renderResume();
            saveState();
        });
    }

    document.getElementById('resetToTemplateBtn').addEventListener('click', () => {
        const resetModal = document.getElementById('resetConfirmModal');
        resetModal.classList.add('active');
    });

    document.getElementById('cancelResetBtn')?.addEventListener('click', () => {
        document.getElementById('resetConfirmModal').classList.remove('active');
    });

    document.getElementById('confirmResetBtn')?.addEventListener('click', () => {
        localStorage.removeItem('nexResumeState');
        window.location.reload();
    });

    // Undo / Redo Init
    document.getElementById('undoBtn')?.addEventListener('click', undo);
    document.getElementById('redoBtn')?.addEventListener('click', redo);

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z') {
                if (e.shiftKey) {
                    e.preventDefault();
                    redo();
                } else {
                    e.preventDefault();
                    undo();
                }
            } else if (e.key === 'y') {
                e.preventDefault();
                redo();
            }
        }
    });
}

function initProfileImageUpload() {
    const imgUpload = document.getElementById('profileImageUpload');
    const removeImgBtn = document.getElementById('removeImageBtn');
    const toggleBorder = document.getElementById('togglePicBorder');

    toggleBorder.checked = resumeState.document.personalInfo.picBorder;
    if (resumeState.document.personalInfo.profilePic) {
        removeImgBtn.style.display = 'flex';
    }

    imgUpload.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (event) {
                compressImage(event.target.result, 400, 400, 0.7, function (compressedBase64) {
                    resumeState.document.personalInfo.profilePic = compressedBase64;
                    removeImgBtn.style.display = 'flex';
                    renderResume();
                });
            };
            reader.readAsDataURL(file);
        }
    });

    removeImgBtn.addEventListener('click', () => {
        resumeState.document.personalInfo.profilePic = '';
        imgUpload.value = '';
        removeImgBtn.style.display = 'none';
        renderResume();
    });

    toggleBorder.addEventListener('change', (e) => {
        resumeState.document.personalInfo.picBorder = e.target.checked;
        renderResume();
    });
}

function initFormattingToolbar() {
    const formatToolbar = document.getElementById('textFormattingToolbar');
    const workspace = document.getElementById('workspace');

    document.addEventListener('selectionchange', () => {
        const selection = window.getSelection();

        if (!selection.isCollapsed && selection.rangeCount > 0) {
            let node = selection.anchorNode;
            let isInsideEditable = false;

            while (node) {
                if (node.nodeType === Node.ELEMENT_NODE && node.getAttribute('contenteditable') === 'true') {
                    isInsideEditable = true;
                    break;
                }
                node = node.parentNode;
            }

            if (isInsideEditable) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                const workspaceRect = workspace.getBoundingClientRect();

                const top = rect.top - workspaceRect.top + workspace.scrollTop;
                const left = rect.left - workspaceRect.left + workspace.scrollLeft + (rect.width / 2);

                formatToolbar.style.display = 'flex';
                formatToolbar.style.top = `${top}px`;
                formatToolbar.style.left = `${left}px`;
                formatToolbar.style.transform = 'translate(-50%, -100%) translateY(-8px)';

                return;
            }
        }
        formatToolbar.style.display = 'none';
    });

    // Modern Selection / Range API wrapper to replace execCommand
    function applyFormat(tagName, styles = {}) {
        const selection = window.getSelection();
        if (!selection.rangeCount || selection.isCollapsed) return;

        const range = selection.getRangeAt(0);
        let node = selection.anchorNode;
        let isInsideEditable = false;

        while (node) {
            if (node.nodeType === Node.ELEMENT_NODE && node.getAttribute('contenteditable') === 'true') {
                isInsideEditable = true;
                break;
            }
            node = node.parentNode;
        }
        if (!isInsideEditable) return;

        const wrapper = document.createElement(tagName);
        for (let key in styles) {
            wrapper.style[key] = styles[key];
        }
        try {
            range.surroundContents(wrapper);
            // Dispatch input event to trigger save
            node.dispatchEvent(new Event('blur', { bubbles: true }));
        } catch (e) {
            // Handle complex selections that cross node boundaries (simplified fallback)
            console.warn("Complex selection formatting not fully supported without a rich text editor library.", e);
        }
    }

    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const command = btn.dataset.command;

            if (command === 'bold') {
                applyFormat('b');
            } else if (command === 'italic') {
                applyFormat('i');
            }

            setTimeout(() => document.dispatchEvent(new Event('selectionchange')), 10);
        });
    });

    document.getElementById('textColorPicker').addEventListener('input', (e) => {
        applyFormat('span', { color: e.target.value });
    });
}

function initSectionModals() {
    const modal = document.getElementById('addSectionModal');
    document.getElementById('addSectionBtn').addEventListener('click', () => modal.classList.add('active'));
    document.querySelector('.close-modal').addEventListener('click', () => modal.classList.remove('active'));

    document.getElementById('confirmAddSection').addEventListener('click', () => {
        const title = document.getElementById('newSectionTitle').value || 'New Section';
        const type = document.getElementById('newSectionType').value;
        const newId = 'sec_' + Date.now();
        const newSection = { id: newId, title, type };

        if (type === 'list') {
            newSection.items = [{ id: 'item_' + Date.now(), title: "Title / Role", period: "Date range", subtitle: "Organization", description: "Describe what you achieved here..." }];
        } else if (type === 'tags') {
            newSection.items = ["Skill 1", "Skill 2", "Skill 3"];
        } else {
            newSection.content = "Enter your paragraph text here...";
        }

        resumeState.document.sections.push(newSection);
        renderResume();
        modal.classList.remove('active');
        document.getElementById('newSectionTitle').value = '';
    });
}

function initATSOptimizer() {
    document.getElementById('atsScoreBtn').addEventListener('click', () => {
        let score = 100;
        let feedback = [];
        const state = resumeState.document;

        if (state.sections.length < 3) {
            score -= 20;
            feedback.push("- Add more standard sections (e.g., Experience, Education, Skills) for better parsing.");
        }
        if (!state.personalInfo.email || !state.personalInfo.phone) {
            score -= 10;
            feedback.push("- Missing email or phone number. ATS systems look for contact data.");
        }
        if (state.personalInfo.profilePic) {
            score -= 5;
            feedback.push("- Profile pictures cannot be read by ATS bots. (Acceptable for networking, but standard ATS might drop it).");
        }

        showInstructionToast(`ATS Compatibility Score: ${score}/100\n\nTips:\n${feedback.length ? feedback.join('\n') : "Looking good! Your document structure matches standard parsing rules."}`, "check-circle", 7000);
    });
}

function initExportFeatures() {
    // Export PDF (ATS-Friendly Native Print)
    document.getElementById('exportPdfBtn').addEventListener('click', () => {
        window.print();
    });

    // Export Word (Real .docx export)
    document.getElementById('exportWordBtn').addEventListener('click', () => {
        const styling = `
            <style>
                body { font-family: ${resumeState.document.design.fontFamily}; color: #000; }
                .res-name { font-size: 24pt; font-weight: bold; }
                .res-title { font-size: 14pt; color: ${resumeState.document.design.primaryColor}; margin-bottom: 10px; }
                .res-contact { font-size: 10pt; color: #555; border-bottom: 2px solid ${resumeState.document.design.primaryColor}; padding-bottom: 20px; margin-bottom: 20px; }
                .res-section-title { font-size: 14pt; font-weight: bold; color: ${resumeState.document.design.primaryColor}; text-transform: uppercase; margin-top: 20px; }
                .res-item-title { font-weight: bold; font-size: 12pt; }
                .res-item-date { float: right; color: #666; font-size: 10pt; }
                .res-item-subtitle { font-weight: bold; font-size: 11pt; margin-bottom: 5px; }
                .res-profile-pic { width: 120px; height: 120px; border-radius: 50%; float: left; margin-right: 20px; }
            </style>
        `;

        const htmlContent = document.getElementById('resumePreview').innerHTML;
        const documentHTML = `
            <!DOCTYPE html>
            <html>
            <head><meta charset='utf-8'><title>Resume</title>${styling}</head>
            <body>${htmlContent}</body>
            </html>
        `;

        const converted = htmlDocx.asBlob(documentHTML);
        const url = URL.createObjectURL(converted);
        const fileDownload = document.createElement("a");
        document.body.appendChild(fileDownload);
        fileDownload.href = url;
        fileDownload.download = `${resumeState.document.personalInfo.name.replace(/\s+/g, '_')}_Resume.docx`;
        fileDownload.click();
        document.body.removeChild(fileDownload);
        URL.revokeObjectURL(url);
    });

    // Export Image
    document.getElementById('exportImgBtn').addEventListener('click', async () => {
        const btn = document.getElementById('exportImgBtn');
        const oldText = btn.innerHTML;
        btn.innerHTML = 'Wait...';
        document.querySelector('.instruction-toast').style.display = 'none';

        try {
            const originalPage = document.querySelector('.a4-page');
            const clone = originalPage.cloneNode(true);

            clone.style.position = 'fixed';
            clone.style.top = '0';
            clone.style.left = '-9999px';
            clone.style.width = '794px';
            clone.style.minHeight = '1123px';
            clone.style.transform = 'none';
            clone.style.margin = '0';
            clone.style.boxShadow = 'none';
            clone.style.backgroundColor = '#ffffff';

            document.body.appendChild(clone);

            // Uncomment below to enable page breaks in Image format:
            // applySmartPageBreaks(clone);

            const canvas = await html2canvas(clone, {
                scale: 3,
                useCORS: true,
                allowTaint: true,
                windowWidth: 794,
                windowHeight: Math.ceil(clone.getBoundingClientRect().height)
            });

            document.body.removeChild(clone);

            const link = document.createElement('a');
            link.download = `${resumeState.document.personalInfo.name.replace(/\s+/g, '_')}_Resume.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
        } catch (e) {
            console.error(e);
        } finally {
            document.querySelector('.instruction-toast').style.display = 'flex';
            btn.innerHTML = oldText;
        }
    });

    // Export JSON Data
    document.getElementById('exportDataBtn').addEventListener('click', () => {
        try {
            const dataString = JSON.stringify(resumeState, null, 2);
            const blob = new Blob([dataString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `${resumeState.document.personalInfo.name.replace(/\s+/g, '_')}_NexResume_Data.json`;
            link.click();

            URL.revokeObjectURL(url);

            showInstructionToast("Resume Data Exported Successfully!", "check", 3000);
        } catch (e) {
            showInstructionToast("Failed to export JSON Data.", "x-circle", 4000);
        }
    });

    // Import JSON Data
    const importBtn = document.getElementById('importDataBtn');
    const importInput = document.getElementById('importDataInput');

    importBtn.addEventListener('click', () => {
        importInput.click();
    });

    importInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (importedData && importedData.document && importedData.document.design) {
                    resumeState = importedData;
                    saveState(true);
                    renderResume();

                    // Reset UI Controls to match imported state
                    document.getElementById('layoutSelector').value = resumeState.document.design.layout || 'layout-single-column';
                    document.getElementById('fontFamilySelector').value = resumeState.document.design.fontFamily;
                    const removeImgBtn = document.getElementById('removeImageBtn');
                    if (resumeState.document.personalInfo.profilePic) {
                        removeImgBtn.style.display = 'flex';
                    } else {
                        removeImgBtn.style.display = 'none';
                    }

                    // Show success
                    showInstructionToast("Data Imported Successfully!", "check", 3000);
                } else {
                    showInstructionToast("Invalid NexResume data file.", "alert-triangle", 4000);
                }
            } catch (err) {
                showInstructionToast("Error parsing JSON file. Make sure it is a valid NexResume export.", "alert-triangle", 4000);
                console.error(err);
            }
        };
        reader.readAsText(file);
        // Reset input so the same file could be selected again if needed
        importInput.value = '';
    });
}

function initMobileTools() {
    function setupMobileToolsMenu() {
        const isMobile = window.innerWidth <= 768;
        const modalBody = document.getElementById('mobileToolsModalBody');
        const profileGroup = document.getElementById('group-profile-pic');
        const typoGroup = document.getElementById('group-typography');
        const footerGroup = document.getElementById('group-footer');

        const profilePlaceholder = document.getElementById('placeholder-profile');
        const typoPlaceholder = document.getElementById('placeholder-typography');
        const footerPlaceholder = document.getElementById('placeholder-footer');

        if (isMobile) {
            if (profileGroup && profileGroup.parentElement !== modalBody) {
                modalBody.appendChild(profileGroup);
                modalBody.appendChild(typoGroup);
                modalBody.appendChild(footerGroup);
                footerGroup.style.borderTop = 'none';
                footerGroup.style.padding = '0';
            }
        } else {
            if (profileGroup && profileGroup.parentElement === modalBody) {
                profilePlaceholder.parentNode.insertBefore(profileGroup, profilePlaceholder.nextSibling);
                typoPlaceholder.parentNode.insertBefore(typoGroup, typoPlaceholder.nextSibling);
                footerPlaceholder.parentNode.insertBefore(footerGroup, footerPlaceholder.nextSibling);
                footerGroup.style.borderTop = '';
                footerGroup.style.padding = '';
            }
        }
    }

    window.addEventListener('resize', setupMobileToolsMenu);
    setupMobileToolsMenu();

    document.getElementById('openMobileToolsBtn')?.addEventListener('click', () => {
        document.getElementById('mobileToolsModal').classList.add('active');
    });
    document.getElementById('closeMobileToolsBtn')?.addEventListener('click', () => {
        document.getElementById('mobileToolsModal').classList.remove('active');
    });
}

function initSplashScreen() {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const splashScreen = document.getElementById('splash-screen');
            const splashBird = document.getElementById('splash-bird');
            const headerBird = document.getElementById('header-bird');

            if (splashScreen && splashBird && headerBird) {
                const headerRect = headerBird.getBoundingClientRect();
                const splashRect = splashBird.getBoundingClientRect();

                const headerCenterX = headerRect.left + (headerRect.width / 2);
                const headerCenterY = headerRect.top + (headerRect.height / 2);
                const splashCenterX = splashRect.left + (splashRect.width / 2);
                const splashCenterY = splashRect.top + (splashRect.height / 2);

                const deltaX = headerCenterX - splashCenterX;
                const deltaY = headerCenterY - splashCenterY;
                const scale = headerRect.width / splashRect.width;

                splashBird.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scale})`;
                splashScreen.style.opacity = '0';
                splashScreen.style.pointerEvents = 'none';

                setTimeout(() => {
                    splashScreen.style.visibility = 'hidden';
                    headerBird.style.opacity = '1';
                    headerBird.style.transition = 'opacity 0.3s ease';
                }, 1000);
            }
        }, 1200);
    });
}

function initZoomControls() {
    function applyZoom() {
        const a4Page = document.querySelector('.a4-page');
        if (!a4Page) return;

        a4Page.style.transformOrigin = window.innerWidth <= 768 ? 'top left' : 'top center';
        a4Page.style.transform = `scale(${currentZoom})`;
        a4Page.style.marginBottom = `calc(-1123px + (1123px * ${currentZoom}))`;

        if (window.innerWidth <= 768) {
            a4Page.style.marginRight = `calc(-794px + (794px * ${currentZoom}))`;
        } else {
            a4Page.style.marginRight = '0';
        }

        document.getElementById('zoomLevelDisplay').textContent = Math.round(currentZoom * 100) + '%';
    }

    document.getElementById('zoomInBtn')?.addEventListener('click', () => {
        if (currentZoom < 2.0) {
            currentZoom += 0.1;
            applyZoom();
        }
    });

    document.getElementById('zoomOutBtn')?.addEventListener('click', () => {
        if (currentZoom > 0.2) {
            currentZoom -= 0.1;
            applyZoom();
        }
    });

    window.addEventListener('resize', applyZoom);
    applyZoom();
}

// ==========================================
// BOOTSTRAP APPLICATION
// ==========================================
function initApp() {
    initThemeControls();
    initProfileImageUpload();
    initFormattingToolbar();
    initSectionModals();
    initATSOptimizer();
    initExportFeatures();
    initMobileTools();
    initSplashScreen();
    initZoomControls();

    // Final render call to populate UI
    renderResume();
}

// Start the app
initApp();