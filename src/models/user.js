import mongoose from 'mongoose'
import Promise from 'bluebird'
import _bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import config from '../config'

const bcrypt = Promise.promisifyAll(_bcrypt)

const UserSchema = mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  gender: {
    type: String,
    required: false
  },
  joinedDate: {
    type: Date,
    default: Date.now
  },
  itemCount: {
    type: Number,
    default: 0
  },
  contentContent: {
    type: Number,
    default: 0
  },
  profilePic: {
    type: String,
    default: '/images/1.mesege_1.png'
  },
  coverPic: {
    type: String,
    default: '/images/bootslead.jpg'
  },
  password: String,
  country: String,
  firstName: String,
  lastName: String,
  zipCode: Number,
  address1: String,
  mobile: Number,
  newsletter: Boolean,

  bannedUntil: Date
})

UserSchema.pre('save', async function (next) {
  const user = this
  if (!user.isModified('password')) return next()

  try {
    let salt = await bcrypt.genSaltAsync(10)
    console.log('password is' + user.password)
    let hash = await bcrypt.hashAsync(user.password, salt)

    user.password = hash
    console.log(`hashed password is ${user.password}`)
    next()
  } catch (e) {
    console.error('Failed to hash password', e)
  }
})

UserSchema.methods.validatePassword = function validatePassword (password) {
  return bcrypt.compareSync(password, this.password)
}

UserSchema.methods.generateToken = function generateToken () {
  const user = this

  return jwt.sign({ id: user.id }, config.token)
}

export default mongoose.model('user', UserSchema)
