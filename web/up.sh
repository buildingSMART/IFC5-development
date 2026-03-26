#! /bin/bash

clear

docker compose -f docker/compose/docker-compose-staging.yaml up --force-recreate --build -d



