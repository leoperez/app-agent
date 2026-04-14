import React from 'react';

// ── Reusable prose components ─────────────────────────────────────────────────

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-semibold mt-8 mb-3 text-foreground">
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-base font-semibold mt-6 mb-2 text-foreground">
      {children}
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
      {children}
    </p>
  );
}

function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul className="list-disc list-inside space-y-1 mb-4 text-sm text-muted-foreground">
      {children}
    </ul>
  );
}

function OL({ children }: { children: React.ReactNode }) {
  return (
    <ol className="list-decimal list-inside space-y-1.5 mb-4 text-sm text-muted-foreground">
      {children}
    </ol>
  );
}

function LI({ children }: { children: React.ReactNode }) {
  return <li className="leading-relaxed">{children}</li>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
      {children}
    </code>
  );
}

function Callout({
  type = 'info',
  children,
}: {
  type?: 'info' | 'warning' | 'tip';
  children: React.ReactNode;
}) {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300',
    warning:
      'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300',
    tip: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300',
  };
  const icons = { info: 'ℹ️', warning: '⚠️', tip: '💡' };
  return (
    <div
      className={`border rounded-lg px-4 py-3 mb-4 text-sm flex gap-2 ${styles[type]}`}
    >
      <span className="shrink-0">{icons[type]}</span>
      <div>{children}</div>
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 mb-5">
      <div className="shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">
        {n}
      </div>
      <div>
        <p className="text-sm font-semibold mb-1">{title}</p>
        <div className="text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

// ── Article contents ──────────────────────────────────────────────────────────

export const CONTENT: Record<string, React.FC> = {
  'what-is-antigravity': () => (
    <div>
      <P>
        Antigravity is an ASO (App Store Optimisation) platform for iOS and
        Android apps. It connects to your App Store Connect and Google Play
        Console accounts to give you a single place to manage metadata,
        screenshots, reviews, keywords, and release notes.
      </P>
      <H2>Core features</H2>
      <UL>
        <LI>
          <strong>Screenshot Studio</strong> — design App Store and Google Play
          screenshots with live preview, AI copy, multi-locale translation, and
          direct push to both stores.
        </LI>
        <LI>
          <strong>Keyword research</strong> — track keyword rankings, analyse
          competitors, and find opportunities.
        </LI>
        <LI>
          <strong>Review management</strong> — read and reply to reviews across
          stores from one inbox.
        </LI>
        <LI>
          <strong>Metadata editor</strong> — edit and version app titles,
          subtitles, descriptions, and release notes with AI assistance.
        </LI>
      </UL>
      <H2>Getting started checklist</H2>
      <OL>
        <LI>Create your team and add your first app.</LI>
        <LI>
          Connect your store credentials (App Store Connect API key or Google
          Play service account).
        </LI>
        <LI>Import your app data from the store.</LI>
        <LI>Open Screenshot Studio and create your first set.</LI>
      </OL>
    </div>
  ),

  'connect-app-store-connect': () => (
    <div>
      <P>
        Antigravity communicates with Apple&apos;s API using an App Store
        Connect API key. This key is scoped to your team and never leaves your
        account — we only use it to read and write data on your behalf.
      </P>
      <H2>Create an API key</H2>
      <Step n={1} title="Go to Users and Access">
        In App Store Connect, open{' '}
        <strong>Users and Access → Keys → App Store Connect API</strong>.
      </Step>
      <Step n={2} title="Generate a new key">
        Click the <strong>+</strong> button. Give it a name (e.g.
        &quot;Antigravity&quot;) and set the access level to{' '}
        <strong>App Manager</strong> (required to upload screenshots and manage
        metadata).
      </Step>
      <Step n={3} title="Download the .p8 file">
        Download the private key file (<Code>.p8</Code>). Apple only lets you
        download it once — keep it safe.
      </Step>
      <Step n={4} title="Note your Key ID and Issuer ID">
        Copy the <strong>Key ID</strong> (10-character string) and the{' '}
        <strong>Issuer ID</strong> (UUID at the top of the Keys page).
      </Step>
      <H2>Add to Antigravity</H2>
      <Step n={5} title="Open Settings → App Store Connect">
        In the Antigravity dashboard, go to{' '}
        <strong>Settings → App Store Connect</strong>.
      </Step>
      <Step n={6} title="Paste your credentials">
        Enter the <strong>Key ID</strong>, <strong>Issuer ID</strong>, and paste
        the contents of the <Code>.p8</Code> file into the Private Key field.
        Save.
      </Step>
      <Callout type="tip">
        The key is stored encrypted at rest. We recommend using an App Manager
        key rather than an Admin key — it has all the permissions Antigravity
        needs.
      </Callout>
      <H2>Required permissions</H2>
      <UL>
        <LI>Read and write app metadata (titles, descriptions, keywords)</LI>
        <LI>Upload and manage screenshots</LI>
        <LI>Read review responses</LI>
      </UL>
    </div>
  ),

  'connect-google-play': () => (
    <div>
      <P>
        Google Play uses a service account (a special Google Cloud account) to
        allow third-party tools to access your Play Console. The setup takes
        about 10 minutes.
      </P>
      <H2>Step-by-step setup</H2>
      <Step n={1} title="Open Google Play Console">
        Go to <strong>Setup → API access</strong> in your Play Console.
      </Step>
      <Step n={2} title="Link to a Google Cloud project">
        If you don&apos;t have a project linked, create one or link an existing
        one. This is a one-time operation per account.
      </Step>
      <Step n={3} title="Create a service account">
        Click <strong>Create new service account</strong>. You&apos;ll be taken
        to Google Cloud Console. Click <strong>Create service account</strong>,
        give it a name, and skip the optional fields. Click{' '}
        <strong>Done</strong>.
      </Step>
      <Step n={4} title="Create and download a JSON key">
        Back in the service accounts list, click the account you just created →{' '}
        <strong>Keys → Add key → Create new key → JSON</strong>. Save the
        downloaded file — you&apos;ll need it in a moment.
      </Step>
      <Step n={5} title="Grant permissions in Play Console">
        Return to Play Console → <strong>API access</strong>. Find your service
        account in the list and click <strong>Manage permissions</strong>. Grant
        it <strong>Release manager</strong> access (needed to upload screenshots
        and commit edits).
      </Step>
      <Step n={6} title="Upload the JSON key to Antigravity">
        In Antigravity, go to <strong>Settings → Google Play</strong>. Paste the
        entire contents of the JSON key file and save.
      </Step>
      <Callout type="warning">
        It can take up to 24 hours for Google to propagate the new service
        account permissions. If pushes fail immediately after setup, wait a few
        hours and try again.
      </Callout>
      <Callout type="info">
        The JSON key is stored per team. Each team member uses the same key —
        you only need to upload it once.
      </Callout>
    </div>
  ),

  'screenshot-studio-overview': () => (
    <div>
      <P>
        Screenshot Studio is a built-in design tool for creating App Store and
        Google Play screenshots. You design slides (background + phone mockup +
        copy), then export them as PNGs or push them directly to the stores.
      </P>
      <H2>Opening the studio</H2>
      <P>
        From the dashboard, click <strong>Screenshots</strong> in the top
        navigation. The studio opens in full-screen mode.
      </P>
      <H2>Basic workflow</H2>
      <OL>
        <LI>
          Click <strong>New set</strong> to create a screenshot set for a
          specific locale.
        </LI>
        <LI>
          Choose a <strong>layout</strong> and <strong>theme</strong> from the
          left panel.
        </LI>
        <LI>
          Click each slide in the left strip to edit its headline, subtitle, and
          upload a screenshot image by dragging a file onto the canvas.
        </LI>
        <LI>
          When happy, click <strong>Save</strong>, then <strong>Export</strong>{' '}
          or <strong>Push to ASC / Push to Google Play</strong>.
        </LI>
      </OL>
      <H2>Key concepts</H2>
      <UL>
        <LI>
          <strong>Set</strong> — a named collection of slides for a specific
          locale (e.g. &quot;en-US iPhone&quot;).
        </LI>
        <LI>
          <strong>Slide</strong> — one screenshot frame with a background, a
          device mockup (optional), and text.
        </LI>
        <LI>
          <strong>Export target</strong> — the pixel dimensions used when
          exporting (e.g. iPhone 6.9&quot; = 1320×2868 px).
        </LI>
      </UL>
    </div>
  ),

  'screenshot-studio-layouts': () => (
    <div>
      <P>
        A layout controls how text and the device frame are arranged on the
        canvas. You can switch layouts at any time — your content is preserved.
      </P>
      <H2>Available layouts</H2>
      <H3>Top text (centered)</H3>
      <P>
        Headline and subtitle at the top, phone centred below. Classic App Store
        style. Good for any content.
      </P>
      <H3>Bottom caption</H3>
      <P>
        The phone fills the frame and text appears at the bottom over a gradient
        fade. Best when the screenshot itself is the hero.
      </P>
      <H3>Text left / Text right (split)</H3>
      <P>
        Copy on one side, phone on the other — horizontal split. Good for wide
        canvases and tablet screenshots.
      </P>
      <H3>Hero</H3>
      <P>
        Oversized headline with the phone small and centred. High impact for the
        first screenshot.
      </P>
      <H3>Feature Graphic</H3>
      <P>
        Landscape 1024×500 px banner required by Google Play. No phone mockup —
        the canvas shows text on the left and your screenshot image on the
        right. Selecting this layout automatically switches the export target to{' '}
        <strong>Feature Graphic (1024×500)</strong>.
      </P>
      <Callout type="tip">
        Feature Graphic is a separate requirement from phone screenshots in
        Google Play. You need both a Feature Graphic set and a phone screenshots
        set for complete store listing coverage.
      </Callout>
      <H2>Device frames</H2>
      <UL>
        <LI>
          <strong>iPhone</strong> — iPhone 15 Pro frame (portrait). Used for App
          Store and Google Play phone screenshots.
        </LI>
        <LI>
          <strong>Android</strong> — Pixel 9 Pro frame (portrait). Used for
          Google Play phone screenshots.
        </LI>
        <LI>
          <strong>iPad</strong> — iPad Pro 13&quot; frame. Used when exporting
          to the iPad 13&quot; export target.
        </LI>
      </UL>
    </div>
  ),

  'screenshot-studio-themes': () => (
    <div>
      <P>
        Themes control the background colour, text colour, and accent colour.
        You can use a built-in theme or override any colour individually.
      </P>
      <H2>Built-in themes</H2>
      <UL>
        <LI>
          <strong>Midnight</strong> — dark background, white text.
        </LI>
        <LI>
          <strong>Ivory</strong> — off-white background, dark text.
        </LI>
        <LI>
          <strong>Violet</strong> — deep purple background.
        </LI>
        <LI>
          <strong>Ocean</strong> — dark blue background with cyan accent.
        </LI>
        <LI>
          <strong>Ember</strong> — near-black with orange accent.
        </LI>
      </UL>
      <H2>Custom colours</H2>
      <P>
        In the left panel, expand <strong>Background</strong> to override the
        background with a solid hex or a gradient (pick two colours and an
        angle). Expand <strong>Text colour</strong> and{' '}
        <strong>Accent colour</strong> to override those independently.
      </P>
      <Callout type="tip">
        Use <strong>Extract from icon</strong> to automatically sample the
        dominant colours from your app icon and apply them as custom colours.
      </Callout>
      <H2>Fonts</H2>
      <P>
        8 font families are available: System (SF Pro / Helvetica), Inter, Sora,
        Space Grotesk, Playfair Display, DM Sans, Raleway, and Bebas Neue.
        Google Fonts are loaded on demand.
      </P>
      <H2>Decorations</H2>
      <P>
        Optional SVG overlays that add visual texture: Circles, Blob, Dot grid,
        Diagonal lines, and Confetti.
      </P>
    </div>
  ),

  'screenshot-studio-ai': () => (
    <div>
      <H2>AI text generation</H2>
      <P>
        Click <strong>Generate with AI</strong> (sparkle icon) in the toolbar.
        Antigravity uses your app&apos;s metadata — title, subtitle, and
        description — to write headline and subtitle copy for each slide.
      </P>
      <P>Guidelines the AI follows:</P>
      <UL>
        <LI>Headlines: ≤ 5 words, benefit-led, no punctuation at end.</LI>
        <LI>Subtitles: ≤ 10 words, expand on the headline.</LI>
        <LI>Copy is written in the app&apos;s primary locale.</LI>
      </UL>
      <Callout type="tip">
        Run generation multiple times — each run produces a different variation.
        Mix and match the best lines across runs.
      </Callout>
      <H2>AI translation</H2>
      <P>
        Click the <strong>Translate</strong> button (globe icon) to open the
        translation panel.
      </P>
      <OL>
        <LI>Select the locales you want to translate into.</LI>
        <LI>
          Choose whether to overwrite any existing manual text overrides for
          those locales.
        </LI>
        <LI>
          Click <strong>Translate</strong>.
        </LI>
      </OL>
      <P>
        Translations are written as per-locale overrides on each slide. The base
        slide text (your source locale) is never modified. When you switch the
        active locale in the editor, the canvas shows the translated copy.
      </P>
      <Callout type="info">
        Translation is rate-limited to 15 requests per hour per user. Each
        request can translate all slides into multiple locales simultaneously.
      </Callout>
    </div>
  ),

  'screenshot-studio-export': () => (
    <div>
      <H2>Export targets</H2>
      <P>
        An export target defines the pixel dimensions of the exported PNG.
        Select the target before exporting:
      </P>
      <UL>
        <LI>
          <strong>iPhone 6.9&quot;</strong> — 1320×2868 px (required for App
          Store)
        </LI>
        <LI>
          <strong>iPhone 6.7&quot;</strong> — 1290×2796 px
        </LI>
        <LI>
          <strong>iPad 13&quot;</strong> — 2064×2752 px
        </LI>
        <LI>
          <strong>Google Play phone</strong> — 1080×1920 px
        </LI>
        <LI>
          <strong>Feature Graphic</strong> — 1024×500 px (Google Play only)
        </LI>
      </UL>
      <Callout type="warning">
        The export button shows an amber warning icon if the selected export
        target&apos;s aspect ratio doesn&apos;t match the current layout. For
        example, using the Feature Graphic layout with a portrait export target
        will produce a distorted image.
      </Callout>
      <H2>Export to ZIP</H2>
      <P>
        Click <strong>Export</strong> in the toolbar and pick a target. All
        slides are rendered as PNGs and bundled into a ZIP file that downloads
        automatically.
      </P>
      <H2>Push to App Store Connect</H2>
      <P>
        Requires ASC credentials configured in Settings. Click{' '}
        <strong>Push to ASC</strong>. Antigravity will:
      </P>
      <OL>
        <LI>Find the open (editable) version in App Store Connect.</LI>
        <LI>Find or create the localization for your active locale.</LI>
        <LI>
          Find or create the screenshot set for the selected display type.
        </LI>
        <LI>Upload each slide in order.</LI>
      </OL>
      <Callout type="warning">
        Pushing replaces all existing screenshots for that locale and display
        type. There is a confirmation prompt before any upload begins.
      </Callout>
      <H2>Push to Google Play</H2>
      <P>
        Requires a Google Play service account configured in Settings. Click{' '}
        <strong>Push to Google Play</strong>. The flow uses a transient edit:
      </P>
      <OL>
        <LI>Creates a new edit in Google Play Console.</LI>
        <LI>Deletes all existing images for that locale + image type.</LI>
        <LI>Uploads the new images.</LI>
        <LI>
          Commits the edit — changes appear as a draft in Google Play Console.
        </LI>
      </OL>
      <Callout type="info">
        After pushing, the changes are in <em>draft</em> state in Google Play
        Console. You still need to submit them for review from the Play Console
        UI.
      </Callout>
    </div>
  ),

  'screenshot-studio-share': () => (
    <div>
      <P>
        Share links let you send a public URL to a client or teammate so they
        can preview the screenshots without needing an Antigravity account.
      </P>
      <H2>Creating a share link</H2>
      <OL>
        <LI>
          Save your set first (the Share button is only available for saved
          sets).
        </LI>
        <LI>
          Click the <strong>Share</strong> icon (↗) in the toolbar.
        </LI>
        <LI>Give the link a label (e.g. &quot;For client review&quot;).</LI>
        <LI>Choose an expiry: no expiry, 7 days, or 30 days.</LI>
        <LI>
          Click <strong>Create link</strong> and copy the URL.
        </LI>
      </OL>
      <H2>The preview page</H2>
      <P>
        Recipients see a clean page with your app icon, set name, and all slides
        with navigation arrows and a thumbnail strip. No login required.
      </P>
      <H2>Managing links</H2>
      <P>
        You can create multiple links for the same set (e.g. one per reviewer).
        Each link can be revoked individually by clicking the trash icon — the
        link immediately stops working.
      </P>
      <Callout type="warning">
        Expired links show an &quot;This preview link has expired&quot; message
        and cannot be reactivated. Create a new link if you need to share again.
      </Callout>
    </div>
  ),

  'screenshot-studio-locales': () => (
    <div>
      <P>
        Antigravity supports managing screenshots for every locale your app is
        available in, from a single interface.
      </P>
      <H2>Duplicate to all locales</H2>
      <P>
        Once you have a polished design in one locale, click the{' '}
        <strong>Duplicate</strong> icon (copy icon) in the toolbar to open the
        Duplicate to Locales panel.
      </P>
      <UL>
        <LI>
          Select the locales you want to copy the design to. Locales that
          already have a set are shown as disabled (they won&apos;t be
          overwritten).
        </LI>
        <LI>
          Click <strong>Duplicate</strong>. The design (theme, layout, font,
          decorations, and slide content) is copied to each selected locale.
        </LI>
      </UL>
      <Callout type="tip">
        After duplicating, use the AI Translation feature to auto-translate the
        text into each locale. This gives you a complete multi-locale screenshot
        set in minutes.
      </Callout>
      <H2>Per-locale text overrides</H2>
      <P>
        Each slide can have text overrides for specific locales. The base slide
        text is your &quot;source of truth&quot;. When you switch the active
        locale in the editor, the canvas renders the locale&apos;s override if
        one exists, falling back to the base text.
      </P>
      <H2>Copy set to another app</H2>
      <P>
        In the <strong>My sets</strong> list, hover over a set card and click
        the copy icon. A dropdown shows all other apps in your team. Selecting
        one copies the full set (design + slides) to that app.
      </P>
    </div>
  ),

  'screenshot-studio-history': () => (
    <div>
      <H2>Undo / Redo</H2>
      <P>
        Use the <strong>↩ Undo</strong> and <strong>↪ Redo</strong> buttons in
        the toolbar (or Cmd+Z / Cmd+Shift+Z) to step through your recent
        changes. Up to 50 states are kept per editing session.
      </P>
      <H2>Saved snapshots</H2>
      <P>
        Snapshots are named checkpoints you can restore at any time, even after
        closing and reopening the studio. Every time you click{' '}
        <strong>Save</strong>, a snapshot is automatically created.
      </P>
      <P>
        To browse snapshots, click <strong>History</strong> (clock icon) in the
        toolbar. You can restore any snapshot or delete old ones.
      </P>
      <Callout type="info">
        The History button is only available for saved sets (not for unsaved new
        sets).
      </Callout>
      <H2>A/B testing</H2>
      <P>
        The A/B test feature lets you formally compare two sets to track which
        performs better.
      </P>
      <OL>
        <LI>
          From the <strong>My sets</strong> list, switch to the{' '}
          <strong>A/B Tests</strong> tab.
        </LI>
        <LI>
          Click <strong>New A/B test</strong>, select Set A and Set B from your
          existing sets, and add an optional note.
        </LI>
        <LI>
          Each test is stored so you can refer back to it and mark a winner.
        </LI>
      </OL>
      <Callout type="tip">
        Create two sets with different themes or copy, push them to the store on
        different dates, and use your store analytics to determine the winner.
      </Callout>
    </div>
  ),

  'google-play-service-account': () => (
    <div>
      <P>
        This article goes into detail on how the Google Play service account
        integration works and how to troubleshoot common issues.
      </P>
      <H2>How the edit flow works</H2>
      <P>
        Google Play uses a transactional &quot;edit&quot; model for all metadata
        and asset changes. Any update must:
      </P>
      <OL>
        <LI>Create a new edit (a temporary workspace).</LI>
        <LI>Make changes within that edit (upload images, update text).</LI>
        <LI>
          Commit the edit — only then do changes become visible (as a draft) in
          Play Console.
        </LI>
      </OL>
      <P>
        If anything fails during upload, Antigravity deletes the edit so it
        doesn&apos;t block future operations.
      </P>
      <H2>Required service account permissions</H2>
      <UL>
        <LI>
          <strong>Release manager</strong> — required to create edits, upload
          screenshots, and commit changes.
        </LI>
      </UL>
      <Callout type="warning">
        If you grant <em>Viewer</em> access only, the push will fail with a 403
        error. Make sure the permission is <em>Release manager</em> or higher.
      </Callout>
      <H2>Common errors</H2>
      <H3>403 Forbidden</H3>
      <P>
        The service account doesn&apos;t have sufficient permissions. Check that
        it has Release manager access in Play Console → Setup → API access.
      </P>
      <H3>Package name not found</H3>
      <P>
        The app&apos;s package name in Antigravity doesn&apos;t match
        what&apos;s in Google Play. Go to the app settings and verify the
        package name (e.g. <Code>com.example.myapp</Code>).
      </P>
      <H3>Changes not visible in Play Console</H3>
      <P>
        After a successful push, changes are in <em>draft</em> state. Open Play
        Console → your app → the relevant track, and you&apos;ll see the updated
        screenshots pending review.
      </P>
      <H3>Permission propagation delay</H3>
      <P>
        After granting permissions to a service account, it can take up to 24
        hours for Google to propagate them. If you get 403 errors immediately
        after setup, wait a few hours and try again.
      </P>
    </div>
  ),
};
