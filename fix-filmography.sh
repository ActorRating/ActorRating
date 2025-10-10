#!/bin/bash

# Find all files with malformed Filmography sections
files=$(find /Users/demirhorzum/ActorRating/actor-rating/src/app/actors -name "page.tsx" -exec grep -l "performances.*</div>" {} \;)

echo "Found $(echo "$files" | wc -l) files to fix"

# Fix each file
for file in $files; do
  echo "Fixing $file"
  
  # Replace the malformed pattern with the correct structure
  sed -i '' 's/<h2 className="text-lg font-bold text-white">/<div className="flex items-center gap-3"><h2 className="text-lg font-bold text-white">/g' "$file"
  sed -i '' 's/<\/h2><span className="text-xs text-gray-400 bg-gray-700\/50 border border-gray-600\/50 px-2 py-1 rounded-full">{sortedPerformances.length} performances<\/span><\/div>/<\/h2><span className="text-xs text-gray-400 bg-gray-700\/50 border border-gray-600\/50 px-2 py-1 rounded-full">{sortedPerformances.length} performances<\/span><\/div>/g' "$file"
done

echo "Done fixing files"
