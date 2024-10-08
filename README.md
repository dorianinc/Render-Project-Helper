# Render Project Helper

A simple script to help keep Render projects up and running made using Render's official API.

> ⚠️ **Warning:** This script only works if you use the **internal database URL** from your Render database. Make sure to configure your database accordingly for this script to function properly.

## Steps to Get Started

1. Clone the project:  
   `git clone <repo-url>`

2. Go into the project directory:  
   `cd <your-project-directory>`

3. Run npm install in terminal:  
   `npm install`

4. Create a .env file:  
   `touch .env`

6. On Render, click on any of your web service applications, click on settings and get service region.

7. Go to account settings in Render and create an API key.

8. Add the following environment variables to .env:  
   ```plaintext
   RENDER_API_KEY=your_api_key_here        # Your Render API key
   DATABASE_NAME=your_database_name        # The name of your new render database
   DATABASE_ENV_KEY=your_database_key      # The name of your key for your render database
   REGION=your_region_here                 # The region you use for your applications (e.g., oregon)  
9. Run the script:  
   `npm start`

## Note

I recommend keeping the project in one location and simply saving the terminal command to run it. This way, you can quickly run it whenever you open the terminal again.

## Resources

- [Render API Documentation](https://api-docs.render.com/reference/introduction)
