#!/bin/bash -x

sudo npm install -g nodemon

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


# git config --global credential.helper cache

# user catecon-git-at-395668725886
# password kcXIXICJvAA5zcUgDHhk2NCgoYLg60XY8zFyT2oeZ1E=
if ! git pull; then
	echo 'Error from git pull';
	exit;
fi

npm install

mkdir -p logs
mkdir -p public/diagram

cat > .env <<EOF
CAT_DIR='/mnt/f/catecon'
CAT_SEARCH_LIMIT=128
CAT_SRVR_LOG='./logs'
CAT_SRVR_LOG_SIZE='100M'
HTTP_DIR='public'
HTTP_PORT=3000
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DB=Catecon
AWS_DGRM_RGN='us-west-1'
AWS_USER_COG_REGION='us-west-2'
AWS_USER_IDENTITY_POOL='us-west-2_HKN5CKGDz'
EOF

chmod 0600 .env

echo "REMEMBER!  Set the MySQL password in the .env file!"
