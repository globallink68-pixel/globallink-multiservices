<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#102746">
    <title>{{ $title }}</title>
    <meta name="description" content="{{ $description }}">
    <meta name="robots" content="{{ $indexable ? 'index, follow' : 'noindex, nofollow' }}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="{{ $title }}">
    <meta property="og:description" content="{{ $description }}">
    <meta name="twitter:card" content="{{ $image ? 'summary_large_image' : 'summary' }}">
    <meta name="twitter:title" content="{{ $title }}">
    <meta name="twitter:description" content="{{ $description }}">
    @if ($canonical)
        <link rel="canonical" href="{{ $canonical }}">
        <meta property="og:url" content="{{ $canonical }}">
    @endif
    @if ($image && $indexable)
        <meta property="og:image" content="{{ $image }}">
        <meta name="twitter:image" content="{{ $image }}">
    @endif
    @foreach ($assets['css'] ?? [] as $stylesheet)
        <link rel="stylesheet" href="/{{ $stylesheet }}">
    @endforeach
</head>
<body>
    <div id="root"></div>
    <noscript>
        <main>
            <h1>{{ $title }}</h1>
            <p>{{ $description }}</p>
            @if ($overview)<p>{{ $overview }}</p>@endif
            <p>Enable JavaScript to use the interactive catalogue, enquiry forms and customer assistant.</p>
            @if ($indexable)
                <nav aria-label="Published services">
                    <a href="/">Home</a>
                    <a href="/services">Services</a>
                    @foreach ($services as $service)
                        <a href="/services/{{ $service->slug }}">{{ $service->title }}</a>
                    @endforeach
                </nav>
            @endif
        </main>
    </noscript>
    @if ($assets)<script type="module" src="/{{ $assets['file'] }}"></script>@endif
</body>
</html>
