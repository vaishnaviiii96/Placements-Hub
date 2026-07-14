import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, zenithId: user.zenithId, name: user.name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
}

/**
 * POST /api/auth/register
 */
export async function register(req, res) {
  try {
    const { zenithId, name, email, password, branch, batchYear } = req.body;

    if (!zenithId || !name || !password) {
      return res.status(400).json({ error: 'zenithId, name, and password are required' });
    }

    // Check for existing user
    const existing = await prisma.user.findUnique({ where: { zenithId } });
    if (existing) {
      return res.status(409).json({ error: 'User with this Zenith ID already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // All users are students
    const role = 'student';

    const user = await prisma.user.create({
      data: {
        zenithId,
        name,
        email: email || null,
        password: hashedPassword,
        branch: branch || null,
        batchYear: batchYear ? parseInt(batchYear, 10) : null,
        role,
      },
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Create session entry for WAU tracking
    await prisma.userSession.create({
      data: { userId: user.id },
    });

    res.status(201).json({
      user: {
        id: user.id,
        zenithId: user.zenithId,
        name: user.name,
        role: user.role,
        branch: user.branch,
        batchYear: user.batchYear,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
}

/**
 * POST /api/auth/login
 */
export async function login(req, res) {
  try {
    const { zenithId, password } = req.body;

    if (!zenithId || !password) {
      return res.status(400).json({ error: 'zenithId and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { zenithId } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Create session entry for WAU tracking
    await prisma.userSession.create({
      data: { userId: user.id },
    });

    res.json({
      user: {
        id: user.id,
        zenithId: user.zenithId,
        name: user.name,
        role: user.role,
        branch: user.branch,
        batchYear: user.batchYear,
      },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
}

/**
 * POST /api/auth/refresh
 */
export async function refresh(req, res) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Rotate tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    console.error('Token refresh error:', err);
    res.status(500).json({ error: 'Token refresh failed' });
  }
}

/**
 * GET /api/auth/me
 */
export async function getMe(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        zenithId: true,
        name: true,
        role: true,
        branch: true,
        batchYear: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}
