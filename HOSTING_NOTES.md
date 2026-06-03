# Hosting Notes

Before uploading this project to hosting, set these environment variables on the server:

```env
DB_HOST=your_host
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=my_project
PORT=3000
SESSION_SECRET=use_a_long_random_secret
MAX_UPLOAD_MB=100
```

Use a hosting plan with persistent storage for the `uploads` folder, or move uploaded files to cloud storage such as S3 or Cloudinary. If the hosting disk is temporary, gallery images, hero images, logos, and videos can disappear after restart.

Always access the hosted site with the domain URL, for example:

```text
https://yourdomain.com
```

Do not use `file:///...` or `localhost` after hosting.

Before deployment, back up:

- The MySQL database
- The `uploads` folder
- The `.env` values used on the server
