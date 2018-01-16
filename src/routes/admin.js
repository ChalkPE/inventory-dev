import Router from 'koa-router'
import Post from '../models/post'
import User from '../models/user'
import Admin from '../models/admin'
import jwt from 'jsonwebtoken'
import koaJwt from 'koa-jwt'
import config from '../config'

function makeParam (data) {
  return {
    username: data.username,
    password: data.password,
    email: data.email,
    name: data.name
  }
}

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

// get my auth info
router.get('/auth', (ctx, next) => {
  ctx.body = Object.assign({}, ctx.state.admin.toJSON(), {
    password: undefined, __v: undefined, _id: undefined
  })
})

// get all admins
router.get('/', checkMaster, async (ctx, next) => {
  ctx.body = { list: await Admin.find({}) }
})

// sign up new admin
router.post('/', checkBody, checkMaster, async (ctx, next) => {
  const param = makeParam(ctx.request.body)
  const { email, username } = param

  if (await Admin.findOne({ email })) ctx.throw(403, 'This email is already taken')
  if (await Admin.findOne({ username })) ctx.throw(403, 'This username is already taken')

  await new Admin(param).save()
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
  ctx.body = { posts: await Post.find({}) }
})

router.delete('/post/:url', async (ctx, next) => {
  const productURL = ctx.params.url

  const post = await Post.findOne({ productURL })
  if (!post) ctx.throw(401, 'Unidentified post')

  await Post.remove({ productURL })
  ctx.body = { success: true }
})

router.get('/user', async (ctx, next) => {
  ctx.body = { users: await User.find({}) }
})

// TODO: 회원 제재

/*
router.get('/board', async (ctx, next) => {
  let posts = []
  await ctx.render('admin/board_list', posts)
})

router.get('/brand_edit', async (ctx, next) => {
  await ctx.render('admin/brand_edit')
})

router.get('/board/regi', async (ctx, next) => {
  await ctx.render('admin/board_register')
})

router.get('/board/theme', async (ctx, next) => {
  await ctx.render('admin/board_theme')
})

router.get('/goods', async (ctx, next) => {
  let posts = await Post.find({})
  await ctx.render('admin/goods_list', {posts: posts})
})

router.get('/goods/reg', async (ctx, next) => {
  await ctx.render('admin/goods_register')
})

router.get('/cate/config', async (ctx, next) => {
  await ctx.render('admin/category_tree')
})

router.get('/cate/config/brand', async (ctx, next) => {
  await ctx.render('admin/category_tree_brand')
})

router.delete('/board/:name', async (ctx, next) => {
  let posts = await Post.remove({'productTitle': /ctx.body/})
  if (posts) { ctx.body = {'su': true} } else { ctx.body = {'su': false} }
})

router.get('/board/config', async (ctx, next) => {
  let post = await Post.find()
  let posts = {'posts': post, 'length': post.length}
  await ctx.render('admin/article_list', posts)
})

router.get('/member', async (ctx, next) => {
  let users = await User.find({})
  await ctx.render('admin/member_list', {users, memberLength: users.length})
})

router.get('/order', async (ctx, next) => {
  await ctx.render('admin/order_list_all')
})

router.get('/order_cancel', async (ctx, next) => {
  await ctx.render('admin/order_list_cancel')
})

router.get('/member/daily', async (ctx, next) => {
  await ctx.render('admin/member_day')
})

router.get('/order/daily', async (ctx, next) => {
  await ctx.render('admin/order_day')
})

router.delete('/member/:name', async (ctx, next) => {
  let query = {'': ''}
  await User.remove(query)
  await ctx.render('admin/hackout_list')
})
*/

export default router
