
import { Component, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService } from './services/ai.service';

declare const jspdf: any;

interface ColoringPage {
  title: string;
  prompt: string;
  imageUrl: string | null;
  status: 'pending' | 'generating' | 'done' | 'error';
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: []
})
export class AppComponent {
  private aiService = inject(AiService);

  theme = signal('');
  childName = signal('');
  resolution = signal('1K');
  pages = signal<ColoringPage[]>([]);
  isGenerating = signal(false);
  progressMessage = signal('');
  
  // Chatbot state
  chatInput = signal('');
  chatHistory = signal<{role: 'user' | 'bot', text: string}[]>([]);
  isChatLoading = signal(false);

  canGenerate = computed(() => this.theme().length > 2 && this.childName().length > 1 && !this.isGenerating());

  async startGeneration() {
    if (!this.canGenerate()) return;

    this.isGenerating.set(true);
    this.progressMessage.set('Thinking up magical scenes...');
    this.pages.set([]);

    try {
      const promptData = await this.aiService.generatePagePrompts(this.theme(), this.childName());
      
      const initialPages: ColoringPage[] = promptData.map((p: any) => ({
        title: p.title,
        prompt: p.visualPrompt,
        imageUrl: null,
        status: 'pending'
      }));
      
      this.pages.set(initialPages);

      for (let i = 0; i < initialPages.length; i++) {
        this.progressMessage.set(`Drawing page ${i + 1} of 5...`);
        this.updatePageStatus(i, 'generating');
        
        try {
          const imgUrl = await this.aiService.generateColoringImage(initialPages[i].prompt, this.resolution());
          this.updatePageImage(i, imgUrl);
        } catch (err) {
          console.error(err);
          this.updatePageStatus(i, 'error');
        }
      }

      this.progressMessage.set('All pages ready!');
    } catch (error) {
      this.progressMessage.set('Oops! The magic failed. Please try again.');
    } finally {
      this.isGenerating.set(false);
    }
  }

  private updatePageStatus(index: number, status: 'pending' | 'generating' | 'done' | 'error') {
    this.pages.update(pages => {
      const newPages = [...pages];
      newPages[index] = { ...newPages[index], status };
      return newPages;
    });
  }

  private updatePageImage(index: number, imageUrl: string) {
    this.pages.update(pages => {
      const newPages = [...pages];
      newPages[index] = { ...newPages[index], imageUrl, status: 'done' };
      return newPages;
    });
  }

  async downloadPdf() {
    const { jsPDF } = jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();

    // Cover Page
    doc.setFillColor(240, 249, 255);
    doc.rect(0, 0, width, height, 'F');
    doc.setFontSize(40);
    doc.setTextColor(30, 64, 175);
    doc.text(`${this.childName()}'s`, width / 2, 60, { align: 'center' });
    doc.setFontSize(30);
    doc.text('Magic Coloring Book', width / 2, 80, { align: 'center' });
    doc.setFontSize(20);
    doc.text(`Theme: ${this.theme()}`, width / 2, 100, { align: 'center' });
    
    // Pages
    for (const page of this.pages()) {
      if (page.imageUrl) {
        doc.addPage();
        // Add title to page
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text(page.title, width / 2, 15, { align: 'center' });
        // Draw image (assuming 3:4 aspect ratio)
        // Image usually starts at data:image/png;base64,...
        doc.addImage(page.imageUrl, 'PNG', 10, 25, width - 20, (width - 20) * 1.33);
      }
    }

    doc.save(`${this.childName()}_Coloring_Book.pdf`);
  }

  async sendChatMessage() {
    const text = this.chatInput().trim();
    if (!text) return;

    this.chatHistory.update(h => [...h, { role: 'user', text }]);
    this.chatInput.set('');
    this.isChatLoading.set(true);

    try {
      const response = await this.aiService.askChatbot(text);
      this.chatHistory.update(h => [...h, { role: 'bot', text: response }]);
    } catch (e) {
      this.chatHistory.update(h => [...h, { role: 'bot', text: "Sorry, I lost my paintbrush! Try again later." }]);
    } finally {
      this.isChatLoading.set(false);
    }
  }
}
