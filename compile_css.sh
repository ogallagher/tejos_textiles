#generates root/public/css/style.css from bulma.sass and style.scss
sass --sourcemap=none sass/style.scss:public/css/style.css

echo "Updated new css at public/css/style.css"

