// OpenClaw Docker Setup Wizard - JavaScript

(function() {
    'use strict';

    // State management
    const state = {
        currentStep: 1,
        totalSteps: 4,
        os: null,
        config: {
            installPath: '',
            extraMounts: {
                enabled: false,
                value: ''
            },
            homeVolume: {
                enabled: false,
                value: 'openclaw_home'
            },
            aptPackages: {
                enabled: false,
                value: ''
            },
            homebrew: false,
            clawdock: true,
            sandbox: false,
            playwright: false,
            skipClone: false
        },
        channels: {
            whatsapp: false,
            telegram: {
                enabled: false,
                token: ''
            },
            discord: {
                enabled: false,
                token: ''
            }
        }
    };

    // DOM Elements
    const elements = {
        prevBtn: document.getElementById('prev-btn'),
        nextBtn: document.getElementById('next-btn'),
        steps: document.querySelectorAll('.step-content'),
        progressSteps: document.querySelectorAll('.progress-step'),
        osCards: document.querySelectorAll('.option-card'),
        copyBtn: document.getElementById('copy-script'),
        scriptCode: document.getElementById('generated-script')
    };

    // Initialize
    function init() {
        bindEvents();
        updateUI();
    }

    // Package management
    let selectedPackages = new Set();

    // Bind all event listeners
    function bindEvents() {
        // Navigation buttons
        elements.prevBtn.addEventListener('click', goToPrevStep);
        elements.nextBtn.addEventListener('click', goToNextStep);

        // OS selection
        elements.osCards.forEach(card => {
            card.addEventListener('click', () => selectOS(card.dataset.os));
        });

        // Copy button
        elements.copyBtn.addEventListener('click', copyToClipboard);

        // Toggle switches
        bindToggle('enable-extra-mounts', 'extra-mounts-field', (checked) => {
            state.config.extraMounts.enabled = checked;
        });

        bindToggle('enable-home-volume', 'home-volume-field', (checked) => {
            state.config.homeVolume.enabled = checked;
        });

        bindToggle('enable-apt-packages', 'apt-packages-field', (checked) => {
            state.config.aptPackages.enabled = checked;
        });

        bindToggle('enable-homebrew', null, (checked) => {
            state.config.homebrew = checked;
        });

        bindToggle('skip-clone', null, (checked) => {
            state.config.skipClone = checked;
        });

        bindToggle('enable-clawdock', null, (checked) => {
            state.config.clawdock = checked;
        });

        bindToggle('enable-sandbox', null, (checked) => {
            state.config.sandbox = checked;
        });

        bindToggle('enable-playwright', null, (checked) => {
            state.config.playwright = checked;
            if (checked && !state.config.homeVolume.enabled) {
                document.getElementById('enable-home-volume').checked = true;
                state.config.homeVolume.enabled = true;
                document.getElementById('home-volume-field').classList.add('visible');
                showToast('Home volume auto-enabled to persist Playwright browsers');
            }
        });

        bindToggle('enable-whatsapp', null, (checked) => {
            state.channels.whatsapp = checked;
        });

        bindToggle('enable-telegram', 'telegram-token-field', (checked) => {
            state.channels.telegram.enabled = checked;
        });

        bindToggle('enable-discord', 'discord-token-field', (checked) => {
            state.channels.discord.enabled = checked;
        });

        // Input fields
        bindInput('install-path', (value) => {
            state.config.installPath = value;
        });

        bindInput('home-volume-name', (value) => {
            state.config.homeVolume.value = value || 'openclaw_home';
        });

        bindInput('telegram-token', (value) => {
            state.channels.telegram.token = value;
        });

        bindInput('discord-token', (value) => {
            state.channels.discord.token = value;
        });

        // Mount rows
        bindMountEvents();

        // Package tags
        bindPackageEvents();
    }

    // Bind mount row events
    function bindMountEvents() {
        const addBtn = document.getElementById('add-mount');
        if (addBtn) {
            addBtn.addEventListener('click', addMountRow);
        }

        // Bind existing remove buttons
        document.querySelectorAll('.mount-remove').forEach(btn => {
            btn.addEventListener('click', (e) => removeMountRow(e.target));
        });

        // Bind directory picker buttons
        document.querySelectorAll('.directory-picker-btn').forEach(btn => {
            btn.addEventListener('click', () => openDirectoryPicker(btn.closest('.mount-row')));
        });

        // Bind the hidden directory picker input
        const dirPicker = document.getElementById('directory-picker');
        if (dirPicker) {
            dirPicker.addEventListener('change', handleDirectorySelection);
        }
    }

    // Add a new mount row
    function addMountRow() {
        const container = document.getElementById('mounts-container');
        const newRow = document.createElement('div');
        newRow.className = 'mount-row';
        newRow.innerHTML = `
            <div class="mount-host-wrapper">
                <input type="text" class="mount-host" placeholder="$HOME/project" title="Host path">
                <button type="button" class="directory-picker-btn" title="Browse for directory">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                </button>
            </div>
            <span class="mount-separator">→</span>
            <input type="text" class="mount-container" placeholder="/home/node/project" title="Container path">
            <select class="mount-mode" title="Access mode">
                <option value="ro">Read-only (ro)</option>
                <option value="rw">Read-write (rw)</option>
            </select>
            <button class="mount-remove" title="Remove this mount">×</button>
        `;
        container.appendChild(newRow);
        
        // Bind remove button
        newRow.querySelector('.mount-remove').addEventListener('click', (e) => removeMountRow(e.target));
        
        // Bind directory picker button
        const pickerBtn = newRow.querySelector('.directory-picker-btn');
        if (pickerBtn) {
            pickerBtn.addEventListener('click', () => openDirectoryPicker(newRow));
        }
    }
    
    // Open directory picker for a mount row
    function openDirectoryPicker(row) {
        const input = document.getElementById('directory-picker');
        const hostInput = row.querySelector('.mount-host');
        
        // Store reference to the target input
        input.dataset.targetRow = row;
        
        // Clear previous selection and trigger click
        input.value = '';
        input.click();
    }
    
    // Handle directory selection
    function handleDirectorySelection(e) {
        const files = e.target.files;
        if (files.length === 0) return;
        
        // Get the directory path from the first file's path
        const filePath = files[0].webkitRelativePath || files[0].name;
        const dirPath = filePath.split('/')[0];
        
        // Find the active mount row and update its input
        const rows = document.querySelectorAll('.mount-row');
        let updated = false;
        
        rows.forEach(row => {
            const hostInput = row.querySelector('.mount-host');
            if (hostInput && !hostInput.value && !updated) {
                // Get the full path (this is tricky in browsers, we'll use what we can)
                // For file:// protocol, we can try to construct a reasonable path
                hostInput.value = dirPath;
                updated = true;
            }
        });
    }

    // Remove a mount row
    function removeMountRow(btn) {
        const row = btn.closest('.mount-row');
        const container = document.getElementById('mounts-container');
        
        // Don't remove if it's the last row
        if (container.children.length > 1) {
            row.remove();
        } else {
            // Clear the inputs instead
            row.querySelector('.mount-host').value = '';
            row.querySelector('.mount-container').value = '';
            row.querySelector('.mount-mode').value = 'ro';
        }
    }

    // Get all mounts as comma-separated string
    function getMountsValue() {
        const rows = document.querySelectorAll('.mount-row');
        const mounts = [];
        
        rows.forEach(row => {
            const host = row.querySelector('.mount-host').value.trim();
            const container = row.querySelector('.mount-container').value.trim();
            const mode = row.querySelector('.mount-mode').value;
            
            if (host && container) {
                mounts.push(`${host}:${container}:${mode}`);
            }
        });
        
        return mounts.join(',');
    }

    // Bind package tag events
    function bindPackageEvents() {
        // Package tag clicks
        document.querySelectorAll('.package-tag').forEach(tag => {
            tag.addEventListener('click', () => togglePackage(tag.dataset.package));
        });

        // Custom package input
        const customInput = document.getElementById('custom-package');
        const addBtn = document.getElementById('add-custom-package');

        if (addBtn) {
            addBtn.addEventListener('click', () => {
                const pkg = customInput.value.trim();
                if (pkg) {
                    addPackage(pkg);
                    customInput.value = '';
                }
            });
        }

        if (customInput) {
            customInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const pkg = customInput.value.trim();
                    if (pkg) {
                        addPackage(pkg);
                        customInput.value = '';
                    }
                }
            });
        }
    }

    // Toggle a package selection
    function togglePackage(pkg) {
        const tag = document.querySelector(`.package-tag[data-package="${pkg}"]`);
        
        if (selectedPackages.has(pkg)) {
            selectedPackages.delete(pkg);
            if (tag) tag.classList.remove('selected');
        } else {
            selectedPackages.add(pkg);
            if (tag) tag.classList.add('selected');
        }
        
        updateSelectedPackagesDisplay();
        updatePackagesInput();
    }

    // Add a custom package
    function addPackage(pkg) {
        if (!selectedPackages.has(pkg)) {
            selectedPackages.add(pkg);
            updateSelectedPackagesDisplay();
            updatePackagesInput();
        }
    }

    // Remove a package
    function removePackage(pkg) {
        selectedPackages.delete(pkg);
        
        // Update tag if it exists
        const tag = document.querySelector(`.package-tag[data-package="${pkg}"]`);
        if (tag) tag.classList.remove('selected');
        
        updateSelectedPackagesDisplay();
        updatePackagesInput();
    }

    // Update the selected packages display
    function updateSelectedPackagesDisplay() {
        const container = document.getElementById('selected-packages');
        
        if (selectedPackages.size === 0) {
            container.innerHTML = '<span class="no-packages">No packages selected</span>';
        } else {
            container.innerHTML = Array.from(selectedPackages).map(pkg => `
                <span class="selected-package">
                    ${pkg}
                    <span class="remove-package" onclick="window.removeSelectedPackage('${pkg}')">×</span>
                </span>
            `).join('');
        }
    }

    // Update the hidden input with package values
    function updatePackagesInput() {
        const input = document.getElementById('apt-packages');
        if (input) {
            input.value = Array.from(selectedPackages).join(' ');
            state.config.aptPackages.value = input.value;
        }
    }

    // Expose remove function globally
    window.removeSelectedPackage = function(pkg) {
        removePackage(pkg);
    };

    // Helper to bind toggle switches
    function bindToggle(checkboxId, fieldId, callback) {
        const checkbox = document.getElementById(checkboxId);
        if (!checkbox) return;

        checkbox.addEventListener('change', (e) => {
            callback(e.target.checked);
            if (fieldId) {
                const field = document.getElementById(fieldId);
                if (field) {
                    field.classList.toggle('visible', e.target.checked);
                }
            }
        });
    }

    // Helper to bind input fields
    function bindInput(inputId, callback) {
        const input = document.getElementById(inputId);
        if (!input) return;

        input.addEventListener('input', (e) => {
            callback(e.target.value);
        });
    }

    // Toast notification
    function showToast(message) {
        const existing = document.querySelector('.toast-notification');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Select OS
    function selectOS(os) {
        state.os = os;
        elements.osCards.forEach(card => {
            card.classList.toggle('selected', card.dataset.os === os);
        });
    }

    // Navigation functions
    function goToNextStep() {
        if (validateCurrentStep()) {
            if (state.currentStep < state.totalSteps) {
                state.currentStep++;
                updateUI();
                
                if (state.currentStep === 4) {
                    generateScript();
                }
            }
        }
    }

    function goToPrevStep() {
        if (state.currentStep > 1) {
            state.currentStep--;
            updateUI();
        }
    }

    // Validation
    function validateCurrentStep() {
        switch (state.currentStep) {
            case 1:
                if (!state.os) {
                    alert('Please select an operating system');
                    return false;
                }
                return true;
            case 2:
                return true;
            case 3:
                return true;
            default:
                return true;
        }
    }

    // Update UI based on current state
    function updateUI() {
        // Update steps visibility
        elements.steps.forEach((step, index) => {
            step.classList.toggle('active', index + 1 === state.currentStep);
        });

        // Update progress bar
        elements.progressSteps.forEach((step, index) => {
            step.classList.remove('active', 'completed');
            if (index + 1 < state.currentStep) {
                step.classList.add('completed');
            } else if (index + 1 === state.currentStep) {
                step.classList.add('active');
            }
        });

        // Update navigation buttons
        elements.prevBtn.disabled = state.currentStep === 1;
        elements.nextBtn.textContent = state.currentStep === state.totalSteps ? 'Finish' : 'Next →';
    }

    // Generate the installation script
    function generateScript() {
        const script = buildScript();
        elements.scriptCode.textContent = script;
    }

    // Build the bash script based on configuration
    function buildScript() {
        const lines = [
            '#!/bin/bash',
            '',
            '# OpenClaw Docker Installation Script',
            '# Generated by OpenClaw Docker Setup Wizard',
            '# OS: ' + getOSDisplayName(state.os),
            '',
            'set -e',
            '',
            'echo "=========================================="',
            'echo "OpenClaw Docker Installation"',
            'echo "=========================================="',
            'echo ""'
        ];

        // Check prerequisites
        lines.push(
            '# Check prerequisites',
            'echo "Checking prerequisites..."',
            'command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed. Aborting." >&2; exit 1; }',
            'command -v git >/dev/null 2>&1 || { echo "Git is required but not installed. Aborting." >&2; exit 1; }',
            'echo "✓ Prerequisites met"',
            'echo ""'
        );

        // Navigate to installation directory
        if (state.config.installPath) {
            lines.push(
                '# Navigate to installation directory',
                'mkdir -p "' + state.config.installPath + '"',
                'cd "' + state.config.installPath + '"',
                ''
            );
        }

        // Clone repository (if not skipped)
        if (!state.config.skipClone) {
            lines.push(
                '# Clone OpenClaw repository',
                'echo "Cloning OpenClaw repository..."',
                'if [ -d "openclaw" ]; then',
                '    echo "Directory openclaw already exists. Pulling latest changes..."',
                '    cd openclaw',
                '    git pull',
                'else',
                '    git clone https://github.com/openclaw/openclaw.git',
                '    cd openclaw',
                'fi',
                'echo "✓ Repository ready"',
                'echo ""'
            );
        } else {
            lines.push(
                '# Using existing repository (clone skipped)',
                'echo "Using existing OpenClaw repository..."',
                'if [ -f "docker-setup.sh" ]; then',
                '    echo "✓ Repository detected in current directory"',
                'else',
                '    echo "Error: docker-setup.sh not found. Are you in the openclaw directory?" >&2',
                '    exit 1',
                'fi',
                'echo ""'
            );
        }

        // Environment variables
        const envVars = [];
        
        const mountsValue = getMountsValue();
        if (state.config.extraMounts.enabled && mountsValue) {
            envVars.push('export OPENCLAW_EXTRA_MOUNTS="' + mountsValue + '"');
        }

        if (state.config.homeVolume.enabled && state.config.homeVolume.value) {
            envVars.push('export OPENCLAW_HOME_VOLUME="' + state.config.homeVolume.value + '"');
        }

        if (state.config.playwright) {
            envVars.push('export PLAYWRIGHT_BROWSERS_PATH=/home/node/.cache/ms-playwright');
        }

        // Set COMPOSE_OPTS to include docker-compose.extra.yml if needed
        if (state.config.homeVolume.enabled || state.config.extraMounts.enabled || state.config.playwright) {
            lines.push('COMPOSE_OPTS="-f docker-compose.yml -f docker-compose.extra.yml"');
        } else {
            lines.push('COMPOSE_OPTS="-f docker-compose.yml"');
        }

        const packagesValue = Array.from(selectedPackages).join(' ');
        if (state.config.aptPackages.enabled && packagesValue) {
            envVars.push('export OPENCLAW_DOCKER_APT_PACKAGES="' + packagesValue + '"');
        }

        if (envVars.length > 0) {
            lines.push(
                '# Set environment variables',
                ...envVars,
                ''
            );
        }

        // Run setup script
        lines.push(
            '# Run Docker setup script',
            'echo "Running Docker setup..."',
            'echo "This may take a few minutes..."',
            './docker-setup.sh',
            'echo ""',
            'echo "✓ Docker setup complete"',
            'echo ""'
        );

        // Install Homebrew if requested
        if (state.config.homebrew) {
            lines.push(
                '# Install Homebrew (inside the Docker container)',
                'echo "Installing Homebrew inside the container..."',
                "docker compose $COMPOSE_OPTS run --rm openclaw-cli bash -lc 'NONINTERACTIVE=1 /bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"'",
                'echo "✓ Homebrew install step complete"',
                'echo ""'
            );
        }

        // Add Playwright env vars to docker-compose.extra.yml after docker-setup.sh
        if (state.config.playwright) {
            lines.push(
                '# Add Playwright environment to docker-compose.extra.yml',
                'if [ -f "docker-compose.extra.yml" ]; then',
                '    cat >> docker-compose.extra.yml << \'EOF\'',
                '',
                '  openclaw-gateway:',
                '    environment:',
                '      - PLAYWRIGHT_BROWSERS_PATH=/home/node/.cache/ms-playwright',
                '      - HOME=/home/node',
                '  openclaw-cli:',
                '    environment:',
                '      - PLAYWRIGHT_BROWSERS_PATH=/home/node/.cache/ms-playwright',
                '      - HOME=/home/node',
                'EOF',
                'else',
                '    cat > docker-compose.extra.yml << \'EOF\'',
                'version: \'3.8\'',
                'services:',
                '  openclaw-gateway:',
                '    environment:',
                '      - PLAYWRIGHT_BROWSERS_PATH=/home/node/.cache/ms-playwright',
                '      - HOME=/home/node',
                '  openclaw-cli:',
                '    environment:',
                '      - PLAYWRIGHT_BROWSERS_PATH=/home/node/.cache/ms-playwright',
                '      - HOME=/home/node',
                'EOF',
                'fi',
                ''
            );
        }

        // Build sandbox if enabled
        if (state.config.sandbox) {
            lines.push(
                '# Build sandbox image',
                'echo "Building sandbox image..."',
                'scripts/sandbox-setup.sh',
                'echo "✓ Sandbox image built"',
                'echo ""'
            );
        }

        // Install Playwright browsers if enabled
        if (state.config.playwright) {
            lines.push(
                '# Install Playwright browsers',
                'echo "Installing Playwright browsers..."',
                'docker compose $COMPOSE_OPTS run --rm openclaw-cli "node /app/node_modules/playwright-core/cli.js install chromium"',
                'echo "✓ Playwright browsers installed"',
                'echo ""'
            );
        }

        // Install ClawDock helpers if enabled
        if (state.config.clawdock) {
            lines.push(
                '# Install ClawDock shell helpers',
                'echo "Installing ClawDock helpers..."',
                'mkdir -p ~/.clawdock',
                'curl -sL https://raw.githubusercontent.com/openclaw/openclaw/main/scripts/shell-helpers/clawdock-helpers.sh -o ~/.clawdock/clawdock-helpers.sh'
            );

            // Add to shell config based on OS
            if (state.os === 'mac') {
                lines.push(
                    'echo "source ~/.clawdock/clawdock-helpers.sh" >> ~/.zshrc',
                    'echo "✓ ClawDock helpers installed to ~/.zshrc"',
                    'echo "   Run: source ~/.zshrc"',
                    'echo "   Or restart your terminal to use clawdock-* commands"'
                );
            } else {
                lines.push(
                    'if [ -f ~/.zshrc ]; then',
                    '    echo "source ~/.clawdock/clawdock-helpers.sh" >> ~/.zshrc',
                    '    echo "✓ ClawDock helpers installed to ~/.zshrc"',
                    'elif [ -f ~/.bashrc ]; then',
                    '    echo "source ~/.clawdock/clawdock-helpers.sh" >> ~/.bashrc',
                    '    echo "✓ ClawDock helpers installed to ~/.bashrc"',
                    'fi',
                    'echo "   Restart your terminal or run: source ~/.clawdock/clawdock-helpers.sh"'
                );
            }
            lines.push('echo ""');
        }

        // Configure channels
        const channelCommands = [];

        if (state.channels.whatsapp) {
            channelCommands.push(
                'echo "Setting up WhatsApp..."',
                'docker compose $COMPOSE_OPTS run --rm openclaw-cli channels login',
                'echo ""'
            );
        }

        if (state.channels.telegram.enabled && state.channels.telegram.token) {
            channelCommands.push(
                'echo "Setting up Telegram..."',
                'docker compose $COMPOSE_OPTS run --rm openclaw-cli channels add --channel telegram --token "' + state.channels.telegram.token + '"',
                'echo ""'
            );
        }

        if (state.channels.discord.enabled && state.channels.discord.token) {
            channelCommands.push(
                'echo "Setting up Discord..."',
                'docker compose $COMPOSE_OPTS run --rm openclaw-cli channels add --channel discord --token "' + state.channels.discord.token + '"',
                'echo ""'
            );
        }

        if (channelCommands.length > 0) {
            lines.push(
                '# Configure channels',
                ...channelCommands
            );
        }

        // Final instructions
        lines.push(
            '# Final output',
            'echo "=========================================="',
            'echo "Installation Complete!"',
            'echo "=========================================="',
            'echo ""',
            'echo "Next steps:"',
            'echo "  1. Open http://127.0.0.1:18789/ in your browser"',
            'echo "  2. Paste the gateway token into Settings → Token"',
            'echo "  3. Start using OpenClaw!"',
            'echo ""',
            'echo "Useful commands:"',
            'echo "  - docker compose $COMPOSE_OPTS ps           # Check container status"',
            'echo "  - docker compose $COMPOSE_OPTS logs -f      # View logs"'
        );

        if (state.config.clawdock) {
            lines.push(
                'echo "  - clawdock-help               # Show all ClawDock commands"',
                'echo "  - clawdock-dashboard          # Open dashboard"'
            );
        }

        lines.push(
            'echo "  - docker compose $COMPOSE_OPTS run --rm openclaw-cli dashboard --no-open"',
            'echo ""',
            'echo "For more info: https://docs.openclaw.ai/install/docker"'
        );

        return lines.join('\n');
    }

    // Get OS display name
    function getOSDisplayName(os) {
        const names = {
            'windows': 'Windows (Git Bash)',
            'linux': 'Linux',
            'mac': 'macOS'
        };
        return names[os] || os;
    }

    // Copy to clipboard functionality
    async function copyToClipboard() {
        const script = elements.scriptCode.textContent;
        
        try {
            await navigator.clipboard.writeText(script);
            
            // Show success feedback
            const originalText = elements.copyBtn.innerHTML;
            elements.copyBtn.classList.add('copied');
            elements.copyBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Copied!
            `;
            
            // Reset after 2 seconds
            setTimeout(() => {
                elements.copyBtn.classList.remove('copied');
                elements.copyBtn.innerHTML = originalText;
            }, 2000);
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = script;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.select();
            
            try {
                document.execCommand('copy');
                elements.copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    elements.copyBtn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        Copy to Clipboard
                    `;
                }, 2000);
            } catch (err) {
                alert('Failed to copy. Please select and copy manually.');
            }
            
            document.body.removeChild(textArea);
        }
    }

    // Auto-detect OS on load
    function detectOS() {
        const userAgent = navigator.userAgent.toLowerCase();
        let detectedOS = 'linux';
        
        if (userAgent.indexOf('win') > -1) {
            detectedOS = 'windows';
        } else if (userAgent.indexOf('mac') > -1) {
            detectedOS = 'mac';
        }
        
        selectOS(detectedOS);
    }

    // Check if running locally (file:// protocol)
    function detectLocalFile() {
        if (window.location.protocol === 'file:') {
            document.body.classList.add('local-file');
        }
    }

    // Start the wizard
    document.addEventListener('DOMContentLoaded', () => {
        init();
        detectOS();
        detectLocalFile();
    });
})();
