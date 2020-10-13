#!/bin/bash

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

git pull

npm install

mkdir -p server/logs
mkdir -p public/diagram

cat > .env <<EOF
CAT_DIR='/mnt/f/catecon'
CAT_SEARCH_LIMIT=128
CAT_SRVR_LOG='./logs'
CAT_SRVR_LOG_SIZE='100M'
HTTP_DIR='public'
HTTP_PORT=8080
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DB=Catecon
AWS_DGRM_RGN='us-west-1'
AWS_DGRM_BKT='catecon-diagrams'
AWS_DIAGRAM_URL='https://catecon-diagrams.s3-us-west-1.amazonaws.com'
AWS_USER_COG_REGION='us-west-2'
AWS_USER_IDENTITY_POOL='us-west-2_HKN5CKGDz'
EOF

echo "REMEMBER!  Set the MySQL password in the .env file!"
echo "Execute the command ./run.sh to start the server."
