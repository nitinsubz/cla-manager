const express = require('express')
const basicAuth = require('express-basic-auth')
const Cla = require('./cla')
const util = require('./util')
const functions = require('firebase-functions')
const logger = functions.logger

module.exports = Gerrit

/**
 * Gerrit-related functions.
 * @param db {FirebaseFirestore.Firestore}
 * @param user {string} to use for HTTP basic auth of all requests
 * @param password {string} to use for HTTP basic auth of all requests
 */
function Gerrit (db, user, password) {
  const app = express()

  /**
   * Express app to handle requests from the gerrit hook (gerrit/ref-update)
   */
  app.use(basicAuth({
    users: { [user]: password }
  })).get('/', (req, res) => {
    if (!('email' in req.query)) {
      return res.json({
        status: 'error',
        message: 'missing email in request'
      })
    }
    return verifyEmail(req.query.email)
      .then(status => res.json(status))
      .catch(error => {
        logger.error(error)
        return res.json({
          status: 'error',
          message: 'Internal error, unable to verify CLA. ' +
            'If the problem persists, please contact support@opennetworking.org '
        })
      })
  })

  /**
   * Checks whether the given email is associated to a whitelisted identity.
   * @param email {string}
   * @returns {Promise<{message: string, status: string}>}
   */
  async function verifyEmail (email) {
    const status = {
      status: 'error',
      message: ''
    }
    const identity = `email:${email}`
    if (await Cla(db).isIdentityWhitelisted(util.identityObj(identity))) {
      status.status = 'success'
    } else {
      status.status = 'failure'
      // TODO: get name from request and use it in message
      status.message = 'Hi user, ' +
        'this is the ONF bot 🤖 I\'m glad you want to contribute to ' +
        'our projects! However, before accepting your contribution, ' +
        'we need to ask you to sign a Contributor License Agreement ' +
        '(CLA). You can do it online, it will take only a few minutes:' +
        '\n\n✒️ 👉 https://cla.opennetworking.org\n\n' +
        'After signing, make sure to add your email ' +
        `${email} to the agreement.` +
        '\n\nFor more information or help:"\n' +
        'https://wiki.opennetworking.org/x/BgCUI'
    }

    return status
  }

  return {
    app: app
  }
}
