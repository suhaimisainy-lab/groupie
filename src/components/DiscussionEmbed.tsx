import React, { useEffect } from "react";

interface DisqusConfig {
  url: string;
  identifier: string;
  title: string;
  language?: string;
}

interface DiscussionEmbedProps {
  shortname: string;
  config: DisqusConfig;
}

/**
 * Custom React-18/Vite compatible DiscussionEmbed component for Disqus.
 * Avoids import/bundler and runtime crashes caused by the legacy "disqus-react" package.
 */
export default function DiscussionEmbed({ shortname, config }: DiscussionEmbedProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Set the global variables that Disqus expects.
    (window as any).disqus_config = function (this: any) {
      this.page.url = config.url;
      this.page.identifier = config.identifier;
      this.page.title = config.title;
      if (config.language) {
        this.language = config.language;
      }
    };

    const loadDisqus = () => {
      const scriptId = "disqus-embed-script";
      const existingScript = document.getElementById(scriptId);

      if (!existingScript) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = `https://${shortname}.disqus.com/embed.js`;
        script.setAttribute("data-timestamp", String(+new Date()));
        script.async = true;
        document.body.appendChild(script);
      } else {
        // If DISQUS is already loaded globally, reset it with the new configuration parameters
        if ((window as any).DISQUS) {
          try {
            (window as any).DISQUS.reset({
              reload: true,
              config: function (this: any) {
                this.page.url = config.url;
                this.page.identifier = config.identifier;
                this.page.title = config.title;
                if (config.language) {
                  this.language = config.language;
                }
              }
            });
          } catch (e) {
            console.error("Failed to reset Disqus with new config:", e);
          }
        }
      }
    };

    // Small delay to ensure the container DOM element '#disqus_thread' is fully mounted
    const timer = setTimeout(loadDisqus, 150);
    return () => clearTimeout(timer);
  }, [shortname, config.url, config.identifier, config.title, config.language]);

  return (
    <div className="disqus-container w-full">
      <div id="disqus_thread" className="min-h-[250px] bg-white rounded-2xl p-2" />
    </div>
  );
}
