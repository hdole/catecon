#!/bin/bash

if [ "`basename $0`" == "install.sh" ] && [ "`dirname $0`" == "." ]; then
	echo "*** Renaming install.sh to install.sh-temp so as not to block install.sh from git pull"
	mv $0 "$0-temp"
fi

echo "*** Install npm nodemon"
npm install nodemon

echo "*** Initializing git"
git init

cat > .git/config <<EOF
[core]
	repositoryformatversion = 0
	filemode = false
	bare = false
	logallrefupdates = true
[remote "origin"]
	url = https://git-codecommit.us-west-1.amazonaws.com/v1/repos/Catecon-web
	fetch = +refs/heads/*:refs/remotes/origin/*
[branch "master"]
	remote = origin
	merge = refs/heads/master
[gitg]
	mainline = refs/heads/master
EOF

if ! git pull; then
	echo 'Error from git pull';
	exit;
fi

echo "*** Installing npm packages"
npm install

mkdir -p logs
mkdir -p public/diagram

echo "*** Create .env file"
cat > .env <<EOF
CAT_PARENT='https://www.catecon.net'
CAT_URL='http://localhost:3000'
CAT_LOCAL=true
CAT_DIAGRAM_USER_LIMIT=1024
CAT_DIR='/mnt/f/catecon'
CAT_SEARCH_LIMIT=128
CAT_SRVR_LOG='./logs'
CAT_SRVR_LOG_SIZE='100M'
HTTP_ADMINS='hdole'
HTTP_DIR='public'
HTTP_PORT=3000
HTTP_UPLOAD_LIMIT='1mb'
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=cat
MYSQL_PASSWORD='cat8tac!'
MYSQL_DB=Catecon
AWS_DGRM_RGN='us-west-1'
AWS_DIAGRAM_URL='https://catecon-diagrams.s3-us-west-1.amazonaws.com'
AWS_USER_COG_REGION='us-west-2'
AWS_USER_IDENTITY_POOL='us-west-2_HKN5CKGDz'
AWS_APP_ID='fjclc9b9lpc83tmkm8b152pin'
NODE_ENV='production'
EOF

chmod 0600 .env

echo "Setup mysql database and user"
sudo mysql -u root -p < sql/Catecon.sql
