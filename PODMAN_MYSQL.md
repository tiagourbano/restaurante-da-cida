podman pull docker.io/library/mysql:8.0
podman volume create restaurante_cida_mysql_data

podman run -d \
  --name restaurante_cida_mysql \
  -e MYSQL_ROOT_PASSWORD=root \
  -v restaurante_cida_mysql_data:/var/lib/mysql \
  -p 3306:3306 \
  docker.io/library/mysql:8.0

podman exec -it restaurante_cida_mysql mysql -uroot -p