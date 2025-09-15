<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>@yield('title', 'Beauty Tech Lab')</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css">

    <link rel="stylesheet" href="{{ asset('css/app.css?v=' . time()) }}">
    <link rel="stylesheet" href="{{ asset('css/button.css?v=' . time()) }}">
    <link rel="stylesheet" href="{{ asset('css/toast.css?v=' . time()) }}">
    <meta name="csrf-token" content="{{ csrf_token() }}">


</head>
<body class="bg-light">
    <div id="header"></div>
    <main id="app"></main>
    <div id="footer"></div>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    
    <script>
    window.BUILD_VERSION = "{{ now()->timestamp }}";
    </script>
    <script type="module" src="{{ asset('js/app.js?v=' . time()) }}"></script>

</body>
</html>
