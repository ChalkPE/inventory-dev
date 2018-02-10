import 'babel-polyfill'

import Koa from 'koa'
import etag from 'koa-etag'
import views from 'koa-views'
import serve from 'koa-static'
import session from 'koa-session'
import passport from 'koa-passport'
import logger from 'koa-chalk-logger'
import bodyParser from 'koa-better-body'
import conditional from 'koa-conditional-get'
import path from 'path'
import routes from './routes'
import config from './config'
import form from './util/formidable'
import chatfeature from './util/chat'
import socketIO from 'socket.io'
import redis from 'socket.io-redis'
import mongoose from 'mongoose'
import Admin from './models/admin'

mongoose.Promise = global.Promise

mongoose
  .connect(config.MONGODB_URI)
  .then(startApp).catch(::console.error)

function startApp () {
  const app = new Koa()
  const port = process.env.PORT || 8080
  const dist = path.resolve(__dirname, '..', 'views')
  const bpOption = {
    fields: 'body',
    IncomingForm: form
  }

  app.keys = ['secret', 'key']
  require('./util/passport')

  app
    .use(logger())
    .use(conditional())
    .use(etag())
    .use(serve(dist))
    .use(session({}, app))
    .use(bodyParser(bpOption))
    .use(passport.initialize())
    .use(passport.session())
    .use(views(dist, { extension: 'pug' }))
    .use(routes())

  let server = app.listen(port, () => console.log(`[!] Server is Running on  ${port}`))
  let io = socketIO(server)
  io.adapter(redis({ host: 'localhost', port: 6379 }))
  chatfeature(io)
}
