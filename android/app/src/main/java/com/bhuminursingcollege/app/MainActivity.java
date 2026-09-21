package com.bhuminursingcollege.app;

import android.app.Activity;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.DownloadListener;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

public class MainActivity extends Activity {

    private static final String HOME_URL =
            "https://bhuminursingcollege-beige.vercel.app/";

    private WebView web;
    private ProgressBar progress;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);

        progress = new ProgressBar(
                this,
                null,
                android.R.attr.progressBarStyleHorizontal
        );

        progress.setMax(100);

        root.addView(
                progress,
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        5
                )
        );

        web = new WebView(this);

        WebSettings settings = web.getSettings();

        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);

        settings.setLoadsImagesAutomatically(true);

        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        settings.setMediaPlaybackRequiresUserGesture(true);

        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);

        settings.setSupportZoom(false);

        web.setWebViewClient(new WebViewClient());

        web.setWebChromeClient(new WebChromeClient() {

            @Override
            public void onProgressChanged(WebView view, int newProgress) {

                progress.setProgress(newProgress);

                if (newProgress >= 100) {
                    progress.setVisibility(View.GONE);
                } else {
                    progress.setVisibility(View.VISIBLE);
                }
            }
        });

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

                        Toast.makeText(
                                MainActivity.this,
                                "Download started",
                                Toast.LENGTH_SHORT
                        ).show();
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

        if (state == null) {
            web.loadUrl(HOME_URL);
        } else {
            web.restoreState(state);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {

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
            web.destroy();
        }

        super.onDestroy();
    }
}
