package com.bhuminursingcollege.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

public class MainActivity extends Activity {

    private static final String HOME_URL =
            "https://bhuminursingcollege-beige.vercel.app/";

    private static final int FILE_CHOOSER_REQUEST = 1001;

    private WebView web;
    private ProgressBar progress;
    private ValueCallback<Uri[]> fileCallback;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);

        createWebView();

        if (state == null) {
            web.loadUrl(HOME_URL);
        } else {
            web.restoreState(state);
        }
    }

    private void createWebView() {

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);

        progress = new ProgressBar(
                this,
                null,
                android.R.attr.progressBarStyleHorizontal
        );

        progress.setMax(100);

        LinearLayout.LayoutParams progressParams =
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        5
                );

        root.addView(progress, progressParams);

        web = new WebView(this);

        // Use the GPU for smoother WebView rendering.
        web.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);

        WebSettings settings = web.getSettings();

        // JavaScript
        settings.setJavaScriptEnabled(true);

        // Website storage / login sessions
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);

        // Media and website content
        settings.setLoadsImagesAutomatically(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setTextZoom(100);
        settings.setDefaultFontSize(16);
        settings.setDefaultFixedFontSize(13);

        // File/content access
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);

        // Mobile browsing
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        // Better cache behavior
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // Keep cookies/login sessions
        CookieManager cookieManager =
                CookieManager.getInstance();

        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(web, true);

        // Keep website pages inside the app
        web.setWebViewClient(new WebViewClient() {

            @Override
            public boolean shouldOverrideUrlLoading(
                    WebView view,
                    WebResourceRequest request
            ) {
                Uri uri = request.getUrl();

                if (uri == null) {
                    return false;
                }

                String url = uri.toString();

                // Keep Bhumi Nursing website inside the app
                if (url.startsWith("https://bhuminursingcollege-beige.vercel.app/")
                        || url.startsWith("http://bhuminursingcollege-beige.vercel.app/")) {

                    view.loadUrl(url);
                    return true;
                }

                // Keep common secure web pages inside WebView
                if (url.startsWith("https://")) {
                    view.loadUrl(url);
                    return true;
                }

                // Open non-web links using Android
                try {
                    Intent intent = new Intent(
                            Intent.ACTION_VIEW,
                            uri
                    );

                    startActivity(intent);
                } catch (Exception ignored) {
                }

                return true;
            }

            @Override
            public void onPageStarted(
                    WebView view,
                    String url,
                    Bitmap favicon
            ) {
                progress.setVisibility(View.VISIBLE);
                super.onPageStarted(view, url, favicon);
            }

            @Override
            public void onPageFinished(
                    WebView view,
                    String url
            ) {
                progress.setProgress(100);
                progress.setVisibility(View.GONE);

                super.onPageFinished(view, url);
            }

            @Override
            public void onReceivedError(
                    WebView view,
                    WebResourceRequest request,
                    WebResourceError error
            ) {
                if (request.isForMainFrame()) {
                    Toast.makeText(
                            MainActivity.this,
                            "Unable to load page. Please check your internet connection.",
                            Toast.LENGTH_LONG
                    ).show();
                }

                super.onReceivedError(
                        view,
                        request,
                        error
                );
            }
        });

        web.setWebChromeClient(new WebChromeClient() {

            @Override
            public void onProgressChanged(
                    WebView view,
                    int newProgress
            ) {

                progress.setProgress(newProgress);

                if (newProgress >= 100) {
                    progress.setVisibility(View.GONE);
                } else {
                    progress.setVisibility(View.VISIBLE);
                }
            }

            // File upload support
            @Override
            public boolean onShowFileChooser(
                    WebView webView,
                    ValueCallback<Uri[]> callback,
                    FileChooserParams params
            ) {

                if (fileCallback != null) {
                    fileCallback.onReceiveValue(null);
                }

                fileCallback = callback;

                Intent intent =
                        params.createIntent();

                try {
                    startActivityForResult(
                            intent,
                            FILE_CHOOSER_REQUEST
                    );
                } catch (Exception e) {

                    fileCallback = null;

                    Toast.makeText(
                            MainActivity.this,
                            "File chooser could not be opened.",
                            Toast.LENGTH_SHORT
                    ).show();

                    return false;
                }

                return true;
            }
        });

        // Download support
        web.setDownloadListener(
                new DownloadListener() {

                    @Override
                    public void onDownloadStart(
                            String url,
                            String userAgent,
                            String contentDisposition,
                            String mimeType,
                            long contentLength
                    ) {

                        try {

                            Intent intent =
                                    new Intent(
                                            Intent.ACTION_VIEW,
                                            Uri.parse(url)
                                    );

                            startActivity(intent);

                        } catch (Exception e) {

                            Toast.makeText(
                                    MainActivity.this,
                                    "Download could not be started.",
                                    Toast.LENGTH_SHORT
                            ).show();
                        }
                    }
                }
        );

        root.addView(
                web,
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        0,
                        1f
                )
        );

        setContentView(root);
    }

    @Override
    protected void onActivityResult(
            int requestCode,
            int resultCode,
            Intent data
    ) {

        super.onActivityResult(
                requestCode,
                resultCode,
                data
        );

        if (requestCode == FILE_CHOOSER_REQUEST) {

            if (fileCallback == null) {
                return;
            }

            Uri[] results = null;

            if (resultCode == RESULT_OK && data != null) {

                Uri selectedUri = data.getData();

                if (selectedUri != null) {
                    results = new Uri[]{selectedUri};
                } else if (data.getClipData() != null) {

                    int count =
                            data.getClipData().getItemCount();

                    results = new Uri[count];

                    for (int i = 0; i < count; i++) {

                        results[i] =
                                data.getClipData()
                                        .getItemAt(i)
                                        .getUri();
                    }
                }
            }

            fileCallback.onReceiveValue(results);
            fileCallback = null;
        }
    }

    @Override
    protected void onSaveInstanceState(
            Bundle outState
    ) {

        if (web != null) {
            web.saveState(outState);
        }

        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {

        if (web != null && web.canGoBack()) {

            web.goBack();

        } else {

            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {

        if (web != null) {

            web.stopLoading();

            web.setWebChromeClient(null);
            web.setWebViewClient(null);

            web.destroy();

            web = null;
        }

        super.onDestroy();
    }
}
