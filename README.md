# Run the server

```bash
RESET_DB=true node index.js
```

## OR

create a `.env` file like so:

```
PORT=YOUR_PORT (if you don't provide that, the default is 8080)
DB_NAME=YOUR_POSTGRES_DB_NAME
DB_USER=YOUR_POSTGRES_DB_USER
DB_PASSWORD=YOUR_POSTGRES_DB_PASSWORD
DB_HOST=localhost
DB_URL=YOUR_DB_URL
JWT_SECRET=YOUR_JWT_SECRET
JWT_EXPIRES_IN=YOUR_JWT_EXPIRATION
SMTP_HOST=YOUR_SMTP_HOST
SMTP_PORT=YOUR_SMTP_PORT
SMTP_USER=YOUR_SMTP_USER
SMTP_PASS=YOUR_SMTP_PASS
RESET_DB=true (if you want to reset the db with each run) 
OR 
SEED=true (if you just want to seed)
```
