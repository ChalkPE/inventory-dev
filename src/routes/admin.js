import Router from 'koa-router'
import koaJwt from 'koa-jwt'
import jwt from 'jsonwebtoken'
import config from '../config'

import Post from '../models/post'
import User from '../models/user'
import Admin from '../models/admin'
import Comment from '../models/comment'
import Message from '../models/message'

function checkBody (ctx, next) {
  if (ctx.request.body) return next()
  else ctx.throw(400, 'Body is empty')
}

async function checkAdmin (ctx, next) {
  const { username } = ctx.state.jwt
  const admin = await Admin.findOne({ username })

  if (!admin) ctx.throw(404, 'Unidentified account')
  await next(ctx.state.admin = admin)
}

async function checkMaster (ctx, next) {
  if (ctx.state.admin.master) await next()
  else ctx.throw(403, 'You are not admin master')
}

const router = new Router({ prefix: '/admin' })

// sign in
router.post('/auth', checkBody, async (ctx, next) => {
  const { username, password } = ctx.request.body
  const user = await Admin.findOne({ username })

  if (!user) ctx.throw(404, 'Unidentified account')
  if (!user.validatePassword(password)) ctx.throw(401, 'Wrong password')

  const data = { username: user.username, _id: user._id }
  ctx.body = { token: jwt.sign(data, config.token) }
})

router
  .use(koaJwt({ secret: config.token, key: 'jwt' }))
  .use(checkAdmin)

async function fetchList (ctx, model, query = {}) {
  const { sort, size, page } = ctx.request.query || {}

  let cursor = model.find(query)
  if (sort) cursor = cursor.sort(sort)
  if (size) cursor = cursor.skip(size * page).limit(size * 1)

  const list = await cursor.exec()
  return { list, total: await model.find(query).count() }
}

// get my auth info
router.get('/auth', (ctx, next) => {
  ctx.body = Object.assign({}, ctx.state.admin.toJSON(), {
    password: undefined, __v: undefined, _id: undefined
  })
})

// get all admins
router.get('/', checkMaster, async (ctx, next) => {
  ctx.body = await fetchList(ctx, Admin)
})

// sign up new admin
router.post('/', checkBody, checkMaster, async (ctx, next) => {
  const { username, password, email, name } = ctx.request.body

  if (await Admin.findOne({ email })) ctx.throw(403, 'This email is already taken')
  if (await Admin.findOne({ username })) ctx.throw(403, 'This username is already taken')

  await new Admin({ username, password, email, name }).save()
  ctx.body = { success: true }
})

// delete admin account
router.delete('/:username', checkMaster, async (ctx, next) => {
  const { username } = ctx.params
  if (username === ctx.state.admin.username) ctx.throw(403, 'You cannot kill yourself')

  const user = await Admin.findOne({ username })
  if (!user) ctx.throw(401, 'Unidentified account')

  await Admin.remove({ username })
  ctx.body = { success: true }
})

router.get('/post', async (ctx, next) => {
  ctx.body = await fetchList(ctx, Post)
})

router.delete('/post/:url', async (ctx, next) => {
  const productURL = ctx.params.url

  const post = await Post.findOne({ productURL })
  if (!post) ctx.throw(401, 'Unidentified post')

  await Post.remove({ productURL })
  ctx.body = { success: true }
})

router.get('/user', async (ctx, next) => {
  ctx.body = await fetchList(ctx, User)
})

router.delete('/user/:username', async (ctx, next) => {
  const { username } = ctx.params
  const { bannedUntil } = ctx.request.query

  const update = { bannedUntil: new Date(Number(bannedUntil)) }
  ctx.body = { success: true, result: await User.findOneAndUpdate({ username }, update) }
})

router.get('/comment/:url', async (ctx, next) => {
  ctx.body = await fetchList(ctx, Comment, { postURL: ctx.params.url })
})

router.delete('/comment/:id', async (ctx, next) => {
  await Comment.findByIdAndRemove(ctx.params.id)
  await Post.update({}, { $pull: { comments: ctx.params.id } }, { multi: true })

  ctx.body = { success: true }
})

router.get('/message', async (ctx, next) => {
  const { regex: $regex } = ctx.request.query
  ctx.body = await fetchList(ctx, Message, { $regex })
})

export default router
