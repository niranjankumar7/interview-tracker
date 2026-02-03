import { Github, Linkedin } from "lucide-react";

const profiles = [
  {
    name: "Niranjan Kumar",
    githubUrl: "https://github.com/niranjankumar7",
    linkedinUrl: "https://www.linkedin.com/in/niranjan-kumar-61b851183/",
  },
  {
    name: "Prajwal R",
    githubUrl: "https://github.com/prajwal-r-207",
    linkedinUrl: "https://www.linkedin.com/in/prajwal-r-9330101b7/",
  },
] as const;

export function Footer() {
  return (
    <footer className="shrink-0 border-t border-gray-200 bg-background text-gray-500 dark:border-gray-800 dark:text-gray-400">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          © 2026 Interview Tracker. All rights reserved.
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {profiles.map((profile) => (
              <div key={profile.githubUrl} className="flex items-center gap-2">
                <span className="text-sm">{profile.name}</span>
                <a
                  href={profile.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded p-1 transition-colors hover:text-gray-700 dark:hover:text-gray-200"
                  aria-label={`${profile.name} on GitHub`}
                >
                  <Github className="h-4 w-4" />
                </a>
                <a
                  href={profile.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded p-1 transition-colors hover:text-gray-700 dark:hover:text-gray-200"
                  aria-label={`${profile.name} on LinkedIn`}
                >
                  <Linkedin className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>

          <span className="inline-flex w-fit items-center rounded-full border border-gray-200 px-2 py-0.5 text-xs dark:border-gray-800">
            Built with Next.js + Tambo
          </span>
        </div>

        <div className="text-xs">
          Data is stored locally on your device. We do not track you.
        </div>
      </div>
    </footer>
  );
}
