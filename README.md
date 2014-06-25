UsfCAStokenAuth
===============

USF Service for CAS backed Token Authentication

## Installing via Bower
```
bower install https://github.com/jamjon3/UsfCAStokenAuth.git#0.0.1-1
```

## Angular Version
Currently, this plugin is using Angular 1.3.0-beta.10 which has improvements
needed for angular $resource.

## Wiring up services with Constants

Your token services needs to be wired up as "constants" in your application. This
is done by assigning key/value pairs on the "applicationResources" constant you define.
In a Yeoman angular app, that would be in the 'app.js' right above the "config" section.

Here's an example for a service we'll call "exampleResource" and it's service URL:

```
.constant("applicationResources",{
    "exampleResource": 'https://dev.it.usf.edu/~james/ExampleApp/services.php'
})
```

This will produce a local storage binding to track tokens and their corresponding token servers with
this defined service. Of course, when you define your 'own' services, you can reference this URL conviently
while passing it into the function as 'applicationResources'.
