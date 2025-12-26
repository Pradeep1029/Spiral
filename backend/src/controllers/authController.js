const mongoose = require('mongoose');
const User = require('../models/User');
const { signToken } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

exports.deviceAuth = async (req, res, next) => {
  try {
    const { device_id } = req.body || {};
    const deviceId = String(device_id || '').trim();
    if (!deviceId || deviceId.length < 8) {
      throw new AppError('Invalid device_id', 400);
    }

    let user = await User.findOne({ deviceId });
    if (!user) {
      user = await User.create({ deviceId, lastSeenAt: new Date() });
    } else {
      user.lastSeenAt = new Date();
      await user.save();
    }

    const token = signToken({ userId: user._id.toString() });

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          device_id: user.deviceId,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    if (!req.user || !mongoose.isValidObjectId(req.user._id)) {
      throw new AppError('Unauthorized', 401);
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user._id,
          device_id: req.user.deviceId,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};
