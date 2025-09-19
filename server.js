// Backend server for OTP verification system
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Real SMS Service Integration Guide
/*
To integrate with real SMS services, replace the simulateSMSService function with:

1. TWILIO INTEGRATION:
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function sendSMSWithTwilio(mobileNumber, otp) {
    try {
        const message = await client.messages.create({
            body: `Your verification code is: ${otp}. Valid for 5 minutes.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: `+91${mobileNumber}`
        });
        console.log(`Twilio SMS sent: ${message.sid}`);
        return { success: true, messageId: message.sid };
    } catch (error) {
        console.error('Twilio error:', error);
        throw new Error('Failed to send SMS via Twilio');
    }
}

2. AMAZON SNS INTEGRATION:
const AWS = require('aws-sdk');
const sns = new AWS.SNS({ region: 'us-east-1' });

async function sendSMSWithSNS(mobileNumber, otp) {
    try {
        const params = {
            Message: `Your verification code is: ${otp}. Valid for 5 minutes.`,
            PhoneNumber: `+91${mobileNumber}`,
            MessageAttributes: {
                'AWS.SNS.SMS.SenderID': { DataType: 'String', StringValue: 'OTPAPP' },
                'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: 'Transactional' }
            }
        };
        
        const result = await sns.publish(params).promise();
        console.log(`SNS SMS sent: ${result.MessageId}`);
        return { success: true, messageId: result.MessageId };
    } catch (error) {
        console.error('SNS error:', error);
        throw new Error('Failed to send SMS via SNS');
    }
}

3. TEXTLOCAL INTEGRATION:
async function sendSMSWithTextLocal(mobileNumber, otp) {
    try {
        const response = await fetch('https://api.textlocal.in/send/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                apikey: process.env.TEXTLOCAL_API_KEY,
                numbers: mobileNumber,
                message: `Your verification code is: ${otp}. Valid for 5 minutes.`,
                sender: 'OTPAPP'
            })
        });
        
        const data = await response.json();
        if (data.status === 'success') {
            console.log(`TextLocal SMS sent: ${data.messages[0].id}`);
            return { success: true, messageId: data.messages[0].id };
        } else {
            throw new Error(data.errors[0].message);
        }
    } catch (error) {
        console.error('TextLocal error:', error);
        throw new Error('Failed to send SMS via TextLocal');
    }
}

Choose one of these services and replace the simulateSMSService function call in the /api/send-otp endpoint.
*/

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Rate limiting to prevent abuse
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: {
        success: false,
        message: 'Too many OTP requests, please try again later'
    }
});

const verifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 verification attempts per windowMs
    message: {
        success: false,
        message: 'Too many verification attempts, please try again later'
    }
});

// In-memory storage for OTPs (in production, use Redis or database)
const otpStorage = new Map();

// Request tracking for concurrent requests
const requestTracker = new Map();

// Function to track and limit concurrent requests per phone number
function trackRequest(phoneNumber) {
    const now = Date.now();
    const key = phoneNumber;
    
    if (!requestTracker.has(key)) {
        requestTracker.set(key, []);
    }
    
    const requests = requestTracker.get(key);
    
    // Remove requests older than 1 minute
    const validRequests = requests.filter(time => now - time < 60000);
    requestTracker.set(key, validRequests);
    
    // Check if too many requests
    if (validRequests.length >= 3) {
        return false; // Too many requests
    }
    
    // Add current request
    validRequests.push(now);
    requestTracker.set(key, validRequests);
    return true;
}

// Function to get queue position
function getQueuePosition(phoneNumber) {
    const queuePosition = smsQueue.findIndex(item => item.phoneNumber === phoneNumber);
    return queuePosition >= 0 ? queuePosition + 1 : 0;
}

// Request queue for handling multiple SMS requests
const smsQueue = [];
let isProcessingQueue = false;

// Utility function to generate random OTP
function generateOTP(length = 6) {
    return Math.floor(Math.pow(10, length - 1) + Math.random() * 9 * Math.pow(10, length - 1)).toString();
}

// Utility function to validate mobile number
function validateMobileNumber(mobileNumber) {
    const mobileRegex = /^[6-9]\d{9}$/; // Indian mobile number format
    return mobileRegex.test(mobileNumber);
}

// Utility function to validate OTP format
function validateOTP(otp) {
    const otpRegex = /^\d{6}$/;
    return otpRegex.test(otp);
}

// Clean up expired OTPs every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of otpStorage.entries()) {
        if (now > data.expiresAt) {
            otpStorage.delete(key);
        }
    }
}, 5 * 60 * 1000);

// API endpoint to send OTP
app.post('/api/send-otp', otpLimiter, async (req, res) => {
    try {
        const { mobileNumber } = req.body;
        
        // Validate input
        if (!mobileNumber) {
            return res.status(400).json({
                success: false,
                message: 'Mobile number is required'
            });
        }
        
        if (!validateMobileNumber(mobileNumber)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid 10-digit mobile number'
            });
        }
        
        // Check rate limiting per phone number
        if (!trackRequest(mobileNumber)) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests from this number. Please wait a minute before trying again.'
            });
        }
        
        // Check if OTP already exists and is still valid
        const key = `${mobileNumber}`;
        const existingOTP = otpStorage.get(key);
        if (existingOTP && Date.now() < existingOTP.expiresAt) {
            const expiresIn = Math.ceil((existingOTP.expiresAt - Date.now()) / 1000);
            return res.json({
                success: true,
                message: 'OTP already sent. Please check your messages or wait for resend.',
                otp: existingOTP.otp, // For demo purposes only - remove in production
                expiresIn: expiresIn
            });
        }
        
        // Generate OTP
        const otp = generateOTP();
        const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes expiry
        
        // Store OTP with expiry
        otpStorage.set(key, {
            otp: otp,
            expiresAt: expiresAt,
            attempts: 0,
            createdAt: Date.now()
        });
        
        // Add to SMS queue
        smsQueue.push({
            mobileNumber,
            otp,
            timestamp: Date.now()
        });
        
        // Process queue if not already processing
        if (!isProcessingQueue) {
            processSMSQueue();
        }
        
        // Get queue position
        const queuePosition = getQueuePosition(mobileNumber);
        
        console.log(`📝 OTP ${otp} queued for ${mobileNumber} at position ${queuePosition}`);
        
        res.json({
            success: true,
            message: `OTP queued for delivery. Position: ${queuePosition} (Note: SMS delivery may be delayed due to demo mode)`,
            otp: otp, // For demo purposes only - remove in production
            queuePosition: queuePosition,
            estimatedWait: queuePosition * 2 // Estimated seconds to wait
        });
        
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// API endpoint to verify OTP
app.post('/api/verify-otp', verifyLimiter, (req, res) => {
    try {
        const { mobileNumber, otp } = req.body;
        
        // Validate input
        if (!mobileNumber || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Mobile number and OTP are required'
            });
        }
        
        if (!validateMobileNumber(mobileNumber)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid mobile number format'
            });
        }
        
        if (!validateOTP(otp)) {
            return res.status(400).json({
                success: false,
                message: 'OTP must be 6 digits'
            });
        }
        
        // Retrieve stored OTP
        const key = `${mobileNumber}`;
        const storedData = otpStorage.get(key);
        
        if (!storedData) {
            return res.status(400).json({
                success: false,
                message: 'No OTP found for this mobile number'
            });
        }
        
        // Check if OTP has expired
        if (Date.now() > storedData.expiresAt) {
            otpStorage.delete(key);
            return res.status(400).json({
                success: false,
                message: 'OTP has expired. Please request a new one'
            });
        }
        
        // Increment attempts
        storedData.attempts++;
        
        // Verify OTP
        if (storedData.otp === otp) {
            // OTP verified successfully
            otpStorage.delete(key);
            
            res.json({
                success: true,
                message: 'Mobile number verified successfully'
            });
        } else {
            // Invalid OTP
            if (storedData.attempts >= 3) {
                // Too many attempts, delete OTP
                otpStorage.delete(key);
                return res.status(400).json({
                    success: false,
                    message: 'Too many invalid attempts. Please request a new OTP'
                });
            }
            
            res.status(400).json({
                success: false,
                message: 'Invalid OTP, please try again'
            });
        }
        
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Simulate SMS service integration with queue management
function simulateSMSService(mobileNumber, otp) {
    return new Promise((resolve, reject) => {
        // Add to queue
        smsQueue.push({
            mobileNumber,
            otp,
            resolve,
            reject,
            timestamp: Date.now()
        });
        
        // Process queue if not already processing
        if (!isProcessingQueue) {
            processSMSQueue();
        }
    });
}

// Process SMS queue with rate limiting
async function processSMSQueue() {
    if (isProcessingQueue || smsQueue.length === 0) {
        return;
    }
    
    isProcessingQueue = true;
    
    while (smsQueue.length > 0) {
        const request = smsQueue.shift();
        
        try {
            // Simulate SMS processing delay (2-3 seconds per SMS)
            await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
            
            // Simulate successful SMS delivery (95% success rate)
            if (Math.random() > 0.05) {
                console.log(`[SMS Service] ✅ OTP ${request.otp} sent successfully to +91${request.mobileNumber}`);
                request.resolve();
            } else {
                // Simulate SMS failure
                console.log(`[SMS Service] ❌ Failed to send OTP to +91${request.mobileNumber}`);
                request.reject(new Error('SMS delivery failed'));
            }
            
        } catch (error) {
            request.reject(error);
        }
        
        // Small delay between processing requests
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    isProcessingQueue = false;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`OTP Verification Server running on port ${PORT}`);
    console.log(`Access the frontend at: http://localhost:${PORT}`);
    console.log('Available endpoints:');
    console.log('  POST /api/send-otp    - Send OTP to mobile number');
    console.log('  POST /api/verify-otp  - Verify OTP');
    console.log('  GET  /api/health      - Health check');
});

module.exports = app;