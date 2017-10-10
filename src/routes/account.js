import mongoose from 'mongoose'
import Router from 'koa-router'
import passport from 'koa-passport'
import User from '../models/user'
import jwt from 'jsonwebtoken'

mongoose.Promise = global.Promise;
mongoose.connection.on('error', (err) => {
    console.error('MongoDB error: %s', err);
});

const router = new Router({ prefix: '' })

router.post('/signup', async (ctx, next) => {
	let data = ctx.request.body
	const param = await makeParam(data)

	try {
		const user = new User(param)
		await user.save()
		ctx.redirect(`/u/${data.username}`)
	} catch (e) {
		console.error("Failed to save post request", e, param)
	}
})

router.post('/login', async (ctx, next) => {
	let userName = ctx.request.body.email
	let password = ctx.request.body.password
	
	try {
		let user = await User.findOne({'username': userName})
		if(user == null) ctx.body = {message: "Couldn't find your account"}
		if(!user.validatePassword(password)) {
				ctx.body = {message: 'Wrong password.'}
		} else {
				let fullName = user.firstName + user.lastName
				ctx.body = {token: jwt.sign({ username: user.username, country: user.country, gender: user.gender , _id: user._id}, 'RESTFULAPIs')}
		}
	} catch (e) {
		console.error(e)
		ctx.body = { message: 'Authentication failed.' }
	}
})

function makeParam(data) {
	return {
		username: data.username,
		password: data.password,
		email: data.email,
		gender: data.gender,
		country: data.country,
		firstName: data.firstname,
		lastName: data.lastname,
		address1: data.address1,
		zipcode: data.zipcode,
		mobile: data.mobile,
		newsletter: data.newsletter
	}
}
export default router