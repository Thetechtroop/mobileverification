// OTP Verification System
class OTPVerification {
    constructor() {
        this.currentSection = 'mobile-section';
        this.mobileNumber = '';
        this.generatedOTP = '';
        this.otpExpiryTime = 60; // 60 seconds
        this.otpTimer = null;
        this.resendTimer = null;
        
        this.initializeElements();
        this.bindEvents();
    }
    
    initializeElements() {
        // Mobile section elements
        this.mobileInput = document.getElementById('mobile-number');
        this.mobileError = document.getElementById('mobile-error');
        this.sendOtpBtn = document.getElementById('send-otp-btn');
        
        // OTP section elements
        this.otpSection = document.getElementById('otp-section');
        this.otpInput = document.getElementById('otp-input');
        this.otpError = document.getElementById('otp-error');
        this.verifyOtpBtn = document.getElementById('verify-otp-btn');
        this.resendOtpBtn = document.getElementById('resend-otp-btn');
        this.displayNumber = document.getElementById('display-number');
        this.smsStatus = document.getElementById('sms-status');
        this.otpTimerElement = document.getElementById('otp-timer');
        this.changeNumberLink = document.getElementById('change-number');
        
        // Success section elements
        this.successSection = document.getElementById('success-section');
        this.continueBtn = document.getElementById('continue-btn');
    }
    
    bindEvents() {
        // Mobile number input events
        this.mobileInput.addEventListener('input', (e) => this.validateMobileInput(e));
        this.mobileInput.addEventListener('keypress', (e) => this.handleMobileKeyPress(e));
        this.sendOtpBtn.addEventListener('click', () => this.sendOTP());
        
        // OTP input events
        this.otpInput.addEventListener('input', (e) => this.validateOTPInput(e));
        this.otpInput.addEventListener('keypress', (e) => this.handleOTPKeyPress(e));
        this.verifyOtpBtn.addEventListener('click', () => this.verifyOTP());
        this.resendOtpBtn.addEventListener('click', () => this.resendOTP());
        this.changeNumberLink.addEventListener('click', (e) => this.changeNumber(e));
        
        // Success section
        this.continueBtn.addEventListener('click', () => this.resetForm());
    }
    
    validateMobileInput(event) {
        const value = event.target.value;
        const cleanedValue = value.replace(/\D/g, ''); // Remove non-digits
        
        if (cleanedValue !== value) {
            event.target.value = cleanedValue;
        }
        
        if (cleanedValue.length === 10) {
            this.mobileNumber = cleanedValue;
            this.sendOtpBtn.disabled = false;
            this.mobileError.textContent = '';
            this.mobileInput.classList.remove('error');
            this.mobileInput.classList.add('success');
        } else {
            this.sendOtpBtn.disabled = true;
            this.mobileInput.classList.remove('success');
            
            if (cleanedValue.length > 0) {
                this.mobileError.textContent = 'Please enter a valid 10-digit mobile number';
                this.mobileInput.classList.add('error');
            } else {
                this.mobileError.textContent = '';
                this.mobileInput.classList.remove('error');
            }
        }
    }
    
    handleMobileKeyPress(event) {
        if (event.key === 'Enter' && !this.sendOtpBtn.disabled) {
            this.sendOTP();
        }
    }
    
    showTemporaryMessage(message, type = 'info') {
        // Remove existing temporary messages
        const existingMessages = document.querySelectorAll('.temp-message');
        existingMessages.forEach(msg => msg.remove());
        
        // Create new message
        const messageElement = document.createElement('div');
        messageElement.className = `temp-message ${type}`;
        messageElement.textContent = message;
        
        document.body.appendChild(messageElement);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.remove();
            }
        }, 3000);
    }

    updateSMSStatus(status, message) {
        if (!this.smsStatus) return;
        
        this.smsStatus.className = `sms-status ${status}`;
        const statusText = this.smsStatus.querySelector('.status-text');
        const statusDot = this.smsStatus.querySelector('.status-dot');
        
        if (statusText) {
            statusText.textContent = message;
        }
        
        // Update status dot color based on status
        if (statusDot) {
            statusDot.className = `status-dot ${status}`;
        }
    }

    async sendOTP() {
        if (this.mobileNumber.length !== 10) {
            this.showError(this.mobileError, 'Please enter a valid 10-digit mobile number');
            return;
        }
        
        this.setLoading(this.sendOtpBtn, true);
        
        // Show processing status
        this.updateSMSStatus('processing', 'Sending OTP...');
        
        try {
            // Send OTP via API
            const response = await this.sendOTPRequest(this.mobileNumber);
            
            if (response.success) {
                this.generatedOTP = response.otp;
                this.displayNumber.textContent = `+91 ${this.mobileNumber}`;
                
                // Update SMS status based on response
                if (response.queuePosition && response.queuePosition > 1) {
                    this.updateSMSStatus('info', `Queued at position ${response.queuePosition}. Estimated wait: ${response.estimatedWait}s`);
                } else if (response.message && response.message.includes('delivery may be delayed')) {
                    this.updateSMSStatus('info', 'Demo mode: Check console for OTP');
                } else {
                    this.updateSMSStatus('success', 'OTP sent successfully!');
                }
                
                this.showSection('otp-section');
                this.startOTPTimer();
                this.clearInputs();
            } else {
                this.updateSMSStatus('failed', 'Failed to send OTP');
                this.showError(this.mobileError, response.message || 'Failed to send OTP. Please try again.');
            }
        } catch (error) {
            this.showError(this.mobileError, error.message || 'Network error. Please check your connection and try again.');
        } finally {
            this.setLoading(this.sendOtpBtn, false);
        }
    }
    
    async sendOTPRequest(mobileNumber) {
        try {
            const response = await fetch('/api/send-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ mobileNumber })
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error sending OTP:', error);
            throw new Error('Network error. Please check your connection.');
        }
    }
    
    validateOTPInput(event) {
        const value = event.target.value;
        const cleanedValue = value.replace(/\D/g, ''); // Remove non-digits
        
        if (cleanedValue !== value) {
            event.target.value = cleanedValue;
        }
        
        if (cleanedValue.length === 6) {
            this.verifyOtpBtn.disabled = false;
            this.otpError.textContent = '';
            this.otpInput.classList.remove('error');
            this.otpInput.classList.add('success');
        } else {
            this.verifyOtpBtn.disabled = true;
            this.otpInput.classList.remove('success');
            
            if (cleanedValue.length > 0) {
                this.otpError.textContent = 'Please enter a 6-digit OTP';
                this.otpInput.classList.add('error');
            } else {
                this.otpError.textContent = '';
                this.otpInput.classList.remove('error');
            }
        }
    }
    
    handleOTPKeyPress(event) {
        if (event.key === 'Enter' && !this.verifyOtpBtn.disabled) {
            this.verifyOTP();
        }
    }
    
    async verifyOTP() {
        const enteredOTP = this.otpInput.value;
        
        if (enteredOTP.length !== 6) {
            this.showError(this.otpError, 'Please enter a valid 6-digit OTP');
            return;
        }
        
        this.setLoading(this.verifyOtpBtn, true);
        
        try {
            // Verify OTP via API
            const response = await this.verifyOTPRequest(this.mobileNumber, enteredOTP);
            
            if (response.success) {
                this.stopOTPTimer();
                this.showSection('success-section');
                this.clearInputs();
            } else {
                this.showError(this.otpError, response.message || 'Invalid OTP. Please try again.');
                this.otpInput.classList.add('error');
                this.otpInput.classList.remove('success');
            }
        } catch (error) {
            this.showError(this.otpError, error.message || 'Network error. Please try again.');
        } finally {
            this.setLoading(this.verifyOtpBtn, false);
        }
    }
    
    async verifyOTPRequest(mobileNumber, otp) {
        try {
            const response = await fetch('/api/verify-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ mobileNumber, otp })
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error verifying OTP:', error);
            throw new Error('Network error. Please check your connection.');
        }
    }
    
    async resendOTP() {
        this.setLoading(this.resendOtpBtn, true);
        
        // Show processing status
        this.updateSMSStatus('processing', 'Resending OTP...');

        try {
            const response = await this.sendOTPRequest(this.mobileNumber);
            
            if (response.success) {
                this.generatedOTP = response.otp;
                
                // Update SMS status based on response
                if (response.queuePosition && response.queuePosition > 1) {
                    this.updateSMSStatus('info', `Queued at position ${response.queuePosition}. Estimated wait: ${response.estimatedWait}s`);
                } else {
                    this.updateSMSStatus('success', 'OTP resent successfully!');
                }
                
                this.startOTPTimer();
                this.otpInput.value = '';
                this.otpInput.classList.remove('error', 'success');
                this.otpError.textContent = '';
                this.verifyOtpBtn.disabled = true;
            } else {
                this.updateSMSStatus('failed', 'Failed to resend OTP');
                this.showError(this.otpError, response.message || 'Failed to resend OTP. Please try again.');
            }
        } catch (error) {
            this.updateSMSStatus('failed', 'Failed to resend OTP');
            this.showError(this.otpError, error.message || 'Failed to resend OTP. Please try again.');
        } finally {
            this.setLoading(this.resendOtpBtn, false);
        }
    }
    
    changeNumber(event) {
        event.preventDefault();
        this.stopOTPTimer();
        this.showSection('mobile-section');
        this.clearInputs();
    }
    
    startOTPTimer() {
        this.stopOTPTimer();
        let timeLeft = this.otpExpiryTime;
        
        this.resendOtpBtn.disabled = true;
        this.otpTimerElement.textContent = `Resend in ${timeLeft}s`;
        
        this.otpTimer = setInterval(() => {
            timeLeft--;
            this.otpTimerElement.textContent = `Resend in ${timeLeft}s`;
            
            if (timeLeft <= 0) {
                this.stopOTPTimer();
                this.otpTimerElement.textContent = 'OTP expired';
                this.resendOtpBtn.disabled = false;
            }
        }, 1000);
    }
    
    stopOTPTimer() {
        if (this.otpTimer) {
            clearInterval(this.otpTimer);
            this.otpTimer = null;
        }
    }
    
    showSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Show target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionId;
        }
    }
    
    showError(element, message) {
        element.textContent = message;
        setTimeout(() => {
            element.textContent = '';
        }, 5000);
    }
    
    showTemporaryMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `temp-message ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            animation: slideIn 0.3s ease;
            background: ${type === 'success' ? '#27ae60' : '#667eea'};
        `;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }
    
    setLoading(button, loading) {
        if (loading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = button.id === 'send-otp-btn' ? this.mobileNumber.length !== 10 : 
                           button.id === 'verify-otp-btn' ? this.otpInput.value.length !== 6 : false;
        }
    }
    
    clearInputs() {
        this.otpInput.value = '';
        this.otpInput.classList.remove('error', 'success');
        this.otpError.textContent = '';
        this.verifyOtpBtn.disabled = true;
    }
    
    resetForm() {
        this.mobileInput.value = '';
        this.mobileInput.classList.remove('error', 'success');
        this.mobileError.textContent = '';
        this.sendOtpBtn.disabled = true;
        this.stopOTPTimer();
        this.showSection('mobile-section');
        this.generatedOTP = '';
    }
}

// Add CSS for temporary messages
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new OTPVerification();
});