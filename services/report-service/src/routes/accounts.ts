import { Router, Request, Response } from 'express';
import { checkEmail, checkPassword, createAccount } from '../services/authentication';

console.log('accounts routes loaded');
export const accountRoutes = Router()

// Login endpoint
accountRoutes.post('/login', async (req: Request, res: Response) => {
    try {
        const { email, password, username } = req.body;

        // Validate fields
        if (!email || !password) {
          return res.status(400).json({
            error: 'Missing required fields',
            required: ['email', 'password']
          });
        }

        if (req.session.userId) {
            return res.status(400).json({
                error: 'Already Logged In'
            })
        }

        const email_check = await checkEmail({email, username})

        if (email_check.rowCount === 0) {
            return res.status(401).json({
                error: 'Invalid Credentials'
            });
        }

        const user = email_check.rows[0]

        if (!user) {
            return res.status(401).json({
                error: 'Invalid Credentials'
            });
        }

        const pass_check_result = await checkPassword(password, user.password_hash)

        if (!pass_check_result) {
            return res.status(401).json({
                error: 'Invalid Credentials'
            });
        }

        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;

        return res.status(200).json({
            success: true
        })
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
})

// Register endpoint
accountRoutes.post('/register', async (req: Request, res: Response) => {
    try {
        const { email, password, username } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: "Missing required fields",
                required: ["email", "password"],
            });
        }

        if (req.session.userId) {
            return res.status(400).json({
                error: 'Already Logged In'
            })
        }

        const result = await createAccount({email, password, username})

        req.session.userId = result.id;
        req.session.username = result.username;
        req.session.role = result.role;

        return res.status(200).json({
            success: true
        })        
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
})

// Get Session Information
accountRoutes.get('/me', (req: Request, res: Response) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'Not logged in' });
    }

    return res.status(200).json({
        userId: req.session.userId,
        role: req.session.role,
        username: req.session.username
    });
});

// Logout
accountRoutes.post('/logout', (req: Request, res: Response) => {
    if (!req.session) {
        return res.status(400).json({ error: 'No session found' });
    }

    req.session.destroy(err => {
        if (err) {
            console.error('Failed to destroy session:', err);
            return res.status(500).json({ error: 'Failed to logout' });
        }

        res.clearCookie('citizen.sid');

        return res.status(200).json({ success: true, message: 'Logged out successfully' });
    });
});