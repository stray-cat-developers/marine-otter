# marine-otter
github app을 이용하여 개발 코드를 release 시 개발자가 git flow의 꼬임을 방지해주고 자동으로 tag를 생성하는 봇입니다.
> A GitHub App built with [Probot](https://github.com/probot/probot)

[![Build Status](https://app.travis-ci.com/fennec-fox/marine-otter.svg?branch=master)](https://app.travis-ci.com/fennec-fox/marine-otter)


## How to use
// TODO

## Support Git Flow
- two branch tag release 전략
  - master
    - 개발(alpha) 버전 Branch.
    - feature branch를 만들어서 개발을 하고 master에 merge 함. (squash merging)  
  - release
    - 배포 대기(ready to release) Branch
    - 개발 버전이 테스트 완료 된 후 이를 base:release <- compare:master PR로 올린다. 
  - tag(release version)
    - production 버전 tag source
    - 릴리즈 봇이 PR merge를 하며 자동으로 tag를 만든다.

## New Features!
- base:release <- compare:master PR을 만들면 릴리즈 봇이 동작하여 git에 comment를 남기면 자동으로 tag를 생성합니다.
  - conflicts가 발생하거나 이미 같은 버전의 tag가 있으면 alert를 줍니다.
- 혹시 모를 master, release간 git tree의 불일치 문제를 master에서 release를 pull 함으로 release의 hotfix가 자동으로 master에 적용됩니다.
  - 만약 conflicts가 발생하면 PR comment로 alert를 줍니다.
- release 버전을 추천해줍니다.

## Setup
```sh
# Install dependencies
npm install

# Compile
npm run build

# Run
npm run start 
```

## Docker
```sh
# 1. Build container
docker build -t marine-otter .

# 2. Start container
docker run -p 3000:3000 marine-otter
```
