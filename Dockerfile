FROM nginx:alpine
RUN rm -R /etc/nginx/conf.d
COPY ./dist/ /var/www/
COPY ./nginx.conf /etc/nginx/nginx.template
CMD envsubst \$PORT < /etc/nginx/nginx.template > /etc/nginx/nginx.conf && nginx
