# Bakes the site into an image, for when you want to ship it somewhere
# rather than run it from this folder. The compose file does NOT use this
# (it bind-mounts ./site instead so edits are live).
#
#   docker build -t contract-whist .
#   docker run -d -p 8088:80 contract-whist

FROM nginx:alpine
COPY site/ /usr/share/nginx/html/
