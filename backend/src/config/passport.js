const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./database');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const name = profile.displayName;
        const googleId = profile.id;

        // Verificar se cliente já existe por email ou google_id
        db.get(
          'SELECT * FROM clients WHERE email = ? OR google_id = ?',
          [email, googleId],
          (err, client) => {
            if (err) {
              return done(err);
            }

            if (client) {
              // Cliente já existe, atualizar google_id se necessário
              if (!client.google_id) {
                db.run(
                  'UPDATE clients SET google_id = ? WHERE id = ?',
                  [googleId, client.id],
                  (updateErr) => {
                    if (updateErr) {
                      return done(updateErr);
                    }
                    return done(null, client);
                  }
                );
              } else {
                return done(null, client);
              }
            } else {
              // Criar novo cliente
              db.run(
                'INSERT INTO clients (name, email, google_id, password) VALUES (?, ?, ?, ?)',
                [name, email, googleId, 'google_oauth_login'], // Senha placeholder
                function (insertErr) {
                  if (insertErr) {
                    return done(insertErr);
                  }

                  db.get(
                    'SELECT * FROM clients WHERE id = ?',
                    [this.lastID],
                    (selectErr, newClient) => {
                      if (selectErr) {
                        return done(selectErr);
                      }
                      return done(null, newClient);
                    }
                  );
                }
              );
            }
          }
        );
      } catch (error) {
        return done(error);
      }
    }
  )
);

module.exports = passport;
