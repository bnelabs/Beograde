import {ChangeDetectionStrategy, Component, signal, computed, inject, PLATFORM_ID} from '@angular/core';
import {CommonModule, isPlatformBrowser} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {MatIconModule} from '@angular/material/icon';
import {animate, stagger} from 'motion';
import {GoogleGenAI} from '@google/genai';
import {BELGRADE_PLACES, Place} from './city-data';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [CommonModule, MatIconModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private platformId = inject(PLATFORM_ID);
  
  places = signal<Place[]>(BELGRADE_PLACES);
  selectedCategory = signal<'all' | 'sight' | 'cuisine' | 'nightlife'>('all');
  
  // AI Assistant State
  userInput = signal('');
  aiResponse = signal<string | null>(null);
  isAiLoading = signal(false);

  filteredPlaces = computed(() => {
    const category = this.selectedCategory();
    if (category === 'all') return this.places();
    return this.places().filter(p => p.category === category);
  });

  setCategory(category: 'all' | 'sight' | 'cuisine' | 'nightlife') {
    this.selectedCategory.set(category);
    
    // Quick animation for entering items
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        const items = document.querySelectorAll('.place-card');
        if (items.length > 0) {
          animate(
            items,
            { opacity: [0, 1], y: [20, 0] },
            { delay: stagger(0.05), duration: 0.5, ease: 'easeOut' }
          );
        }
      }, 0);
    }
  }

  async askAI() {
    if (!this.userInput().trim() || this.isAiLoading()) return;
    if (!isPlatformBrowser(this.platformId)) return;

    this.isAiLoading.set(true);
    this.aiResponse.set(null);

    try {
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      
      const prompt = `You are a Belgrade city expert and travel guide. 
      The user wants a recommendation based on this input: "${this.userInput()}".
      Provide a concise, engaging, and practical suggestion for things to do, eat, or visit in Belgrade.
      Focus on hidden gems or specific "vibe" matches. Keep it under 100 words.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      this.aiResponse.set(response.text || "I couldn't find a recommendation for that. Try another vibe!");
    } catch (error) {
      console.error('AI Error:', error);
      this.aiResponse.set("I'm sorry, Belgrade is busy right now! Try again in a moment.");
    } finally {
      this.isAiLoading.set(false);
      this.userInput.set('');
    }
  }
}
